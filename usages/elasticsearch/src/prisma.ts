import { PrismaClient, Prisma } from "@prisma/client";
import { BaseDMMF } from "@prisma/client/runtime";
import { elasticSearchClient } from "./elasticSearchClient";
import {
  getNewWhereArg,
  getSearchStringMapping,
} from "@prisma-fts/algolia/src/utils";

export const prisma = new PrismaClient();
type Options = {
  syncOn?: Array<"create" | "update" | "upsert" | "delete">;
};

type Indexes = {
  [modelName: string]: {
    objectID: string;
    indexes: { [column: string]: string };
  };
};

export const saveDocOnElasticsearch = async (
  indexMapping: Record<string, string>,
  data: Record<string, unknown>,
  pk: string
) => {
  const selectedColumns = Object.keys(data);
  if (
    !data[pk] ||
    !Object.keys(indexMapping).every((key) => selectedColumns.includes(key))
  )
    throw new Error(
      `Selected columns are missing for index mapping keys; either omit the select parameter or specify select to cover all index mapping keys and the primary key (${pk}).`
    );

  const objectMapping = Object.entries(indexMapping).reduce<
    Record<string, Record<string, unknown>>
  >((res, [column, index]) => {
    if (!data[column]) return res;
    if (!res[index]) return { ...res, [index]: { [column]: data[column] } };
    return {
      ...res,
      [index]: {
        ...res[index],
        [column]: data[column],
      },
    };
  }, {});
  return Promise.all(
    Object.entries(objectMapping).map(([index, document]) =>
      elasticSearchClient.index({
        index,
        id: String(data[pk]),
        document,
      })
    )
  );
};

export const deleteDocOnElasticsearch = async (
  indexMapping: Record<string, string>,
  data: Record<string, unknown>,
  pk: string
) => {
  if (!data[pk])
    throw new Error(
      `The selected column does not have a primary key; either omit the select parameter or specify select to cover the primary key (${pk}).`
    );

  return Promise.all(
    [...new Set(Object.values(indexMapping))].map((index) =>
      elasticSearchClient.delete({ index, id: String(data[pk]) })
    )
  );
};

export const searchByElasticsearchIndexes = async <T extends boolean>(
  indexMapping: Record<string, string>,
  mapping: Record<string, string>,
  pkIsNumber?: T
): Promise<
  T extends true ? Record<string, number[]> : Record<string, string[]>
> => {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(mapping).map(async ([key, val]) => {
        const [col] = key.match(/[^.]+$/) ?? [];
        const index = indexMapping[col];
        const [option] = val.match(/\{.*}$/) ?? ["{}"];
        const res = await elasticSearchClient.search({
          index,
          query: {
            match: {
              [col]: {
                query: val.replace(/\{.*}$/, ""),
                ...JSON.parse(option),
              },
            },
          },
        });

        return [
          key,
          res.hits.hits.map(({ _id }) => (pkIsNumber ? Number(_id) : _id)),
        ];
      })
    )
  );
};

export const elasticsearchFTS =
  (dmmf: BaseDMMF, indexes: Indexes, options?: Options): Prisma.Middleware =>
  async (params, next) => {
    if (!params.model || !indexes[params.model]) return next(params);
    const indexMapping = indexes[params.model].indexes;
    const pk = indexes[params.model].objectID;
    const pkIsNumber =
      dmmf.datamodel.models
        .find(({ name }) => name === params.model)
        ?.fields.find(({ name }) => name === pk)?.type === "Int";

    if (
      ["findMany", "findFirst", "groupBy", "count", "aggregate"].includes(
        params.action
      ) &&
      params.args?.where
    ) {
      params.args.where = getNewWhereArg(
        params.args.where,
        await searchByElasticsearchIndexes(
          indexMapping,
          getSearchStringMapping(Object.keys(indexMapping), params.args.where),
          pkIsNumber
        ),
        pk
      );
      return next(params);
    }
    if (params.action === "create" && options?.syncOn?.includes("create")) {
      const record = await next(params);
      await saveDocOnElasticsearch(indexMapping, record, pk);
      return record;
    }
    if (params.action === "upsert" && options?.syncOn?.includes("upsert")) {
      const record = await next(params);
      await saveDocOnElasticsearch(indexMapping, record, pk);
      return record;
    }
    if (params.action === "update" && options?.syncOn?.includes("update")) {
      const record = await next(params);
      await saveDocOnElasticsearch(indexMapping, record, pk);
      return record;
    }
    if (params.action === "delete" && options?.syncOn?.includes("delete")) {
      const record = await next(params);
      await deleteDocOnElasticsearch(indexMapping, record, pk);
      return record;
    }

    return next(params);
  };

prisma.$use(
  elasticsearchFTS(
    Prisma.dmmf,
    {
      Post: {
        objectID: "id",
        indexes: {
          title: "post_index",
          content: "post_index",
        },
      },
    },
    {
      syncOn: ["create", "update", "delete", "upsert"],
    }
  )
);

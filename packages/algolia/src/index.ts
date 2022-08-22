import type { SearchIndex } from "algoliasearch";
import type { Prisma } from "@prisma/client";
import type { BaseDMMF } from "@prisma/client/runtime";
import { getNewWhereArg, getSearchStringMapping } from "./utils";

export const searchByAlgoliaIndexes = async <T extends boolean>(
  indexMapping: Record<string, SearchIndex>,
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
        const res = await index.search(
          val.replace(/\{.*}$/, ""),
          JSON.parse(option)
        );
        return [
          key,
          res.hits.map(({ objectID }) =>
            pkIsNumber ? Number(objectID) : objectID
          ),
        ];
      })
    )
  );
};

export const saveObjectOnAlgolia = async (
  indexMapping: Record<string, SearchIndex>,
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
    Record<string, { index: SearchIndex; object: Record<string, unknown> }>
  >((res, [column, index]) => {
    const key = `${index.appId}-${index.indexName}`;
    if (!data[column]) return res;
    if (!res[key])
      return { ...res, [key]: { index, object: { [column]: data[column] } } };
    return {
      ...res,
      [key]: {
        ...res[key],
        object: { ...res[key].object, [column]: data[column] },
      },
    };
  }, {});
  await Promise.all(
    Object.values(objectMapping).map(({ index, object }) =>
      index.saveObject({ ...object, objectID: data[pk] })
    )
  );
};

export const deleteObjectOnAlgolia = async (
  indexMapping: Record<string, SearchIndex>,
  data: Record<string, unknown>,
  pk: string
) => {
  if (!data[pk])
    throw new Error(
      `The selected column does not have a primary key; either omit the select parameter or specify select to cover the primary key (${pk}).`
    );

  const indexes = Object.values(indexMapping).reduce<
    Record<string, SearchIndex>
  >((res, index) => {
    const key = `${index.appId}-${index.indexName}`;
    if (!res[key]) return { ...res, [key]: index };
    return res;
  }, {});
  await Promise.all(
    Object.values(indexes).map((index) => index.deleteObject(String(data[pk])))
  );
};

type Options = {
  syncOn?: Array<"create" | "update" | "upsert" | "delete">;
};

type Indexes = {
  [modelName: string]: {
    objectID: string;
    indexes: { [column: string]: SearchIndex };
  };
};

export const algoliaFTS =
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
      ["findMany", "findFirst"].includes(params.action) &&
      params.args?.where
    ) {
      params.args.where = getNewWhereArg(
        params.args.where,
        await searchByAlgoliaIndexes(
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
      await saveObjectOnAlgolia(indexMapping, record, pk);
      return record;
    }
    if (params.action === "upsert" && options?.syncOn?.includes("upsert")) {
      const record = await next(params);
      await saveObjectOnAlgolia(indexMapping, record, pk);
      return record;
    }
    if (params.action === "update" && options?.syncOn?.includes("update")) {
      const record = await next(params);
      await saveObjectOnAlgolia(indexMapping, record, pk);
      return record;
    }
    if (params.action === "delete" && options?.syncOn?.includes("delete")) {
      const record = await next(params);
      await deleteObjectOnAlgolia(indexMapping, record, pk);
      return record;
    }

    return next(params);
  };

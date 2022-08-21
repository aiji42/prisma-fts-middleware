import type { SearchIndex } from "algoliasearch";
import type { Prisma } from "@prisma/client";
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
        const res = await index.search(val);
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

export const saveObjectOnAlgoLia = async (
  indexMapping: Record<string, SearchIndex>,
  data: Record<string, unknown>,
  pk = "id"
) => {
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

export const algoliaFTS =
  (
    indexes: Record<Prisma.ModelName, Record<string, SearchIndex>>,
    pk = "id"
  ): Prisma.Middleware =>
  async (params, next) => {
    if (!params.model || !indexes[params.model]) return next(params);
    const indexMapping = indexes[params.model];

    if (params.action.startsWith("find") && params.args.where) {
      params.args.where = getNewWhereArg(
        params.args.where,
        await searchByAlgoliaIndexes(
          indexMapping,
          getSearchStringMapping(Object.keys(indexMapping), params.args.where),
          true
        ),
        pk
      );
      return next(params);
    }
    if (params.action === "create") {
      const record = await next(params);
      await saveObjectOnAlgoLia(indexMapping, record, pk);
    }

    return next(params);
  };

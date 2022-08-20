import type { SearchIndex } from "algoliasearch";
import type { Prisma } from "@prisma/client";
import { getNewWhereArg, getSearchStringMapping } from "./utils";

export const searchByAlgoliaIndexes = async <T extends boolean>(
  indexes: Record<string, SearchIndex>,
  mapping: Record<string, string>,
  pkIsNumber?: T
): Promise<
  T extends true ? Record<string, number[]> : Record<string, string[]>
> => {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(mapping).map(async ([key, val]) => {
        const [col] = key.match(/[^.]+$/) ?? [];
        const index = indexes[col];
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

export const algoliaFTS =
  (
    indexes: Record<Prisma.ModelName, Record<string, SearchIndex>>
  ): Prisma.Middleware =>
  async (params, next) => {
    if (
      params.action.startsWith("find") &&
      params.args.where &&
      params.model &&
      indexes[params.model]
    ) {
      params.args.where = getNewWhereArg(
        params.args.where,
        await searchByAlgoliaIndexes(
          indexes[params.model],
          getSearchStringMapping(
            Object.keys(indexes[params.model]),
            params.args.where
          ),
          true
        )
      );
      return next(params);
    }

    return next(params);
  };

import { flatten, unflatten } from "flat";

type Enumerable<T> = T | Array<T>;

type WhereInput = {
  AND?: Enumerable<WhereInput>;
  OR?: Enumerable<WhereInput>;
  NOT?: Enumerable<WhereInput>;
} & {
  [column: string]: Filter | number | string | null;
};

type Filter = {
  contains?: string;
} & {
  /* eslint @typescript-eslint/no-explicit-any: 0 */
  [column: string]: any;
};

export const getSearchStringMapping = (
  targetColumns: string[],
  where: WhereInput
): Record<string, string> => {
  return Object.entries(flatten(where)).reduce((res, [key, val]) => {
    return targetColumns.reduce((r, col) => {
      if (!(typeof val === "string" && val.startsWith("fts:"))) return r;
      if (key === col || key.endsWith(`.${col}`))
        return { ...r, [key]: val.replace(/^fts:/, "") };
      return r;
    }, res);
  }, {});
};

export const getNewWhereArg = (
  originalWhere: WhereInput,
  searchedMapping: Record<string, Array<string | number> | null | undefined>,
  pk: string = "id"
): WhereInput => {
  const mergedMapping = Object.entries(searchedMapping).reduce<
    Record<string, Array<string | number>>
  >((res, [key, value]) => {
    const idWithIn = key.replace(/[^.]+$/, `${pk}.in`);
    if (!res[idWithIn])
      return { ...res, [idWithIn]: Array.isArray(value) ? value : [] };
    return {
      ...res,
      [idWithIn]: Array.isArray(value)
        ? value.filter((v) => res[idWithIn].includes(v))
        : [],
    };
  }, {});

  const flattenWhere = Object.entries(
    flatten<WhereInput, Record<string, unknown>>(originalWhere)
  ).reduce((res, [key, val]) => {
    if (searchedMapping[key]) return res;
    // FIXME: Consider id parameters
    return { ...res, [key]: val };
  }, {});

  return unflatten({ ...flattenWhere, ...mergedMapping });
};

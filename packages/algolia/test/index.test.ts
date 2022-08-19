import { test, expect } from "vitest";
import { getSearchStringMapping, getNewWhereArg } from "../src";

test("getSearchStringMapping", () => {
  const searches = getSearchStringMapping(["a", "b"], {
    AND: [{ a: "fts:a1" }],
    OR: {
      b: "fts:b2",
      AND: [{ a: "a3" }, { b: "fts:b4" }, { c: "fts:c5" }],
      OR: { a: "fts:a6", c: "fts:c7" },
    },
    NOT: [{ AND: [{ a: "fts:a8" }] }],
    a: "fts:a9",
    aa: "fts:a10",
    b: { contains: "fts:b11" },
    c: "fts:c12",
  });

  expect(searches).toEqual({
    "AND.0.a": "a1",
    "OR.b": "b2",
    "OR.AND.1.b": "b4",
    "OR.OR.a": "a6",
    "NOT.0.AND.0.a": "a8",
    a: "a9",
  });
});

test("getNewWhereArg", () => {
  expect(
    getNewWhereArg({ content: "fts:foo" }, { content: [1, 2, 3] })
  ).toEqual({
    id: { in: [1, 2, 3] },
  });

  expect(
    getNewWhereArg(
      { AND: [{ content: "fts:foo" }, { content: "fts:bar" }] },
      { "AND.0.content": [1, 2, 3], "AND.1.content": [4, 5, 6] }
    )
  ).toEqual({
    AND: [{ id: { in: [1, 2, 3] } }, { id: { in: [4, 5, 6] } }],
  });

  expect(
    getNewWhereArg(
      {
        content: "fts:bar",
        title: "fts:bar",
      },
      { content: [1, 2, 3], title: [2, 3, 4] }
    )
  ).toMatchObject({
    id: { in: [2, 3] },
  });
});

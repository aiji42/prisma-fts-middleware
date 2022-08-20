import { test, expect, vi } from "vitest";
import { searchByAlgoliaIndexes } from "../src";
import { SearchIndex } from "algoliasearch";

test("searchByAlgoliaIndexes - 1", async () => {
  const search = vi.fn();
  search.mockReturnValue({ hits: [{ objectID: "A" }, { objectID: "B" }] });
  const res = await searchByAlgoliaIndexes(
    {
      content: { search } as unknown as SearchIndex,
    },
    {
      content: "foo",
    }
  );

  expect(search).toBeCalledWith("foo");
  expect(res).toEqual({ content: ["A", "B"] });
});

test("searchByAlgoliaIndexes - 2", async () => {
  const search1 = vi.fn(),
    search2 = vi.fn();
  search1.mockReturnValue({ hits: [{ objectID: "1" }, { objectID: "2" }] });
  search2.mockReturnValue({ hits: [{ objectID: "3" }, { objectID: "4" }] });
  const res = await searchByAlgoliaIndexes(
    {
      content: { search: search1 } as unknown as SearchIndex,
      title: { search: search2 } as unknown as SearchIndex,
    },
    {
      "AND.0.content": "foo",
      "AND.1.title": "bar",
    },
    true
  );

  expect(search1).toBeCalledWith("foo");
  expect(search2).toBeCalledWith("bar");
  expect(res).toEqual({
    "AND.0.content": [1, 2],
    "AND.1.title": [3, 4],
  });
});
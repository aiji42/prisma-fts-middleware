import { test, expect, vi } from "vitest";
import { searchByAlgoliaIndexes, saveObjectOnAlgoLia } from "../src";
import { SearchIndex } from "algoliasearch";

test("searchByAlgoliaIndexes - singleIndex", async () => {
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

test("searchByAlgoliaIndexes - multiIndexes", async () => {
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

test("saveObjectOnAlgoLia", async () => {
  const saveObject1 = vi.fn(),
    saveObject2 = vi.fn(),
    saveObject3 = vi.fn();
  const index1 = {
    appId: "app1",
    indexName: "index1",
    saveObject: saveObject1,
  } as unknown as SearchIndex;
  const index2 = {
    appId: "app1",
    indexName: "index2",
    saveObject: saveObject2,
  } as unknown as SearchIndex;
  const index3 = {
    appId: "app2",
    indexName: "index1",
    saveObject: saveObject3,
  } as unknown as SearchIndex;

  await saveObjectOnAlgoLia(
    {
      title: index1,
      content: index1,
      text: index2,
      note: index3,
    },
    {
      code: "A",
      title: "title",
      content: "content",
      text: "text",
      note: "note",
      name: "name",
    },
    "code"
  );
  expect(saveObject1).toBeCalledWith({
    objectID: "A",
    title: "title",
    content: "content",
  });
  expect(saveObject2).toBeCalledWith({ objectID: "A", text: "text" });
  expect(saveObject3).toBeCalledWith({ objectID: "A", note: "note" });
});

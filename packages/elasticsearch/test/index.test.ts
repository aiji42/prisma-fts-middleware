import { test, expect, vi } from "vitest";
import {
  searchByElasticsearchIndexes,
  saveDocOnElasticsearch,
  deleteDocOnElasticsearch,
} from "../src";
import { Client } from "@elastic/elasticsearch";

test("searchByElasticsearchIndexes - single index", async () => {
  const search = vi.fn();
  search.mockReturnValue({ hits: { hits: [{ _id: "A" }, { _id: "B" }] } });
  const res = await searchByElasticsearchIndexes(
    { search } as unknown as Client,
    {
      content: "post_index",
    },
    {
      content: "foo",
    }
  );

  expect(search).toBeCalledWith({
    index: "post_index",
    query: {
      match: {
        content: {
          query: "foo",
        },
      },
    },
  });
  expect(res).toEqual({ content: ["A", "B"] });
});

test("searchByElasticsearchIndexes - with search options", async () => {
  const search = vi.fn();
  search.mockReturnValue({ hits: { hits: [{ _id: "A" }, { _id: "B" }] } });
  const res = await searchByElasticsearchIndexes(
    { search } as unknown as Client,
    {
      content: "post_index",
    },
    {
      content: 'foo{"operation":"and"}',
    }
  );

  expect(search).toBeCalledWith({
    index: "post_index",
    query: {
      match: {
        content: {
          query: "foo",
          operation: "and",
        },
      },
    },
  });
  expect(res).toEqual({ content: ["A", "B"] });
});

test("searchByElasticsearchIndexes - multi indexes and pkIsNumber is true", async () => {
  const search = vi.fn();
  search.mockImplementation((arg) => {
    if (arg.query.match.content)
      return { hits: { hits: [{ _id: "1" }, { _id: "2" }] } };
    return { hits: { hits: [{ _id: "3" }, { _id: "4" }] } };
  });
  const res = await searchByElasticsearchIndexes(
    { search } as unknown as Client,
    {
      content: "post_index",
      title: "post_index",
    },
    {
      "AND.0.content": "foo",
      "AND.1.title": "bar",
    },
    true
  );

  expect(search).toBeCalledWith({
    index: "post_index",
    query: {
      match: {
        content: {
          query: "foo",
        },
      },
    },
  });
  expect(search).toBeCalledWith({
    index: "post_index",
    query: {
      match: {
        title: {
          query: "bar",
        },
      },
    },
  });
  expect(res).toEqual({
    "AND.0.content": [1, 2],
    "AND.1.title": [3, 4],
  });
});

test("saveDocOnElasticsearch", async () => {
  const index = vi.fn();
  await saveDocOnElasticsearch(
    { index } as unknown as Client,
    {
      title: "post_index_1",
      content: "post_index_1",
      text: "post_index_2",
      note: "post_index_3",
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
  expect(index).toBeCalledWith({
    index: "post_index_1",
    id: "A",
    document: {
      title: "title",
      content: "content",
    },
  });
  expect(index).toBeCalledWith({
    index: "post_index_2",
    id: "A",
    document: {
      text: "text",
    },
  });
  expect(index).toBeCalledWith({
    index: "post_index_3",
    id: "A",
    document: {
      note: "note",
    },
  });
});

test("saveDocOnElasticsearch - Selected data is missing.", () => {
  expect(() =>
    saveDocOnElasticsearch(
      {} as unknown as Client,
      {
        title: "post_index",
        content: "post_index",
      },
      {
        code: "A",
        title: "title",
      },
      "code"
    )
  ).rejects.toThrowError(
    Error(
      "Selected columns are missing for index mapping keys; either omit the select parameter or specify select to cover all index mapping keys and the primary key (code)."
    )
  );

  expect(() =>
    saveDocOnElasticsearch(
      {} as unknown as Client,
      {
        title: "post_index",
        content: "post_index",
      },
      {
        title: "title",
        content: "content",
      },
      "code"
    )
  ).rejects.toThrowError(
    Error(
      "Selected columns are missing for index mapping keys; either omit the select parameter or specify select to cover all index mapping keys and the primary key (code)."
    )
  );
});

test("deleteDocOnElasticsearch", async () => {
  const _delete = vi.fn();
  await deleteDocOnElasticsearch(
    { delete: _delete } as unknown as Client,
    {
      title: "post_index_1",
      content: "post_index_1",
      text: "post_index_2",
      note: "post_index_3",
    },
    {
      code: "A",
    },
    "code"
  );
  expect(_delete).toBeCalledWith({ index: "post_index_1", id: "A" });
  expect(_delete).toBeCalledWith({ index: "post_index_2", id: "A" });
  expect(_delete).toBeCalledWith({ index: "post_index_3", id: "A" });
});

test("deleteDocOnElasticsearch - Primary key is missing.", () => {
  expect(() =>
    deleteDocOnElasticsearch(
      {} as unknown as Client,
      {
        title: "post_index",
        content: "post_index",
      },
      {
        title: "title",
      },
      "code"
    )
  ).rejects.toThrowError(
    Error(
      "The selected column does not have a primary key; either omit the select parameter or specify select to cover the primary key (code)."
    )
  );
});

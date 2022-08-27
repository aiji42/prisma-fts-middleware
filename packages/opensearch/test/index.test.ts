import { test, expect, vi, describe, beforeEach } from "vitest";
import {
  searchByOpenSearchIndexes,
  saveDocOnOpenSearch,
  deleteDocOnOpenSearch,
  openSearchFTS,
} from "../src";
import { Client } from "@opensearch-project/opensearch";
import { getSampleDMMF } from "./__fixtures__/getSampleSchema";
import { Prisma } from "@prisma/client";

test("searchByOpenSearchIndexes - single index", async () => {
  const search = vi.fn();
  search.mockReturnValue({
    body: { hits: { hits: [{ _id: "A" }, { _id: "B" }] } },
  });
  const res = await searchByOpenSearchIndexes(
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
    body: {
      query: {
        match: {
          content: {
            query: "foo",
          },
        },
      },
    },
  });
  expect(res).toEqual({ content: ["A", "B"] });
});

test("searchByOpenSearchIndexes - with search options", async () => {
  const search = vi.fn();
  search.mockReturnValue({
    body: { hits: { hits: [{ _id: "A" }, { _id: "B" }] } },
  });
  const res = await searchByOpenSearchIndexes(
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
    body: {
      query: {
        match: {
          content: {
            query: "foo",
            operation: "and",
          },
        },
      },
    },
  });
  expect(res).toEqual({ content: ["A", "B"] });
});

test("searchByOpenSearchIndexes - multi indexes and pkIsNumber is true", async () => {
  const search = vi.fn();
  search.mockImplementation((arg) => {
    if (arg.body.query.match.content)
      return { body: { hits: { hits: [{ _id: "1" }, { _id: "2" }] } } };
    return { body: { hits: { hits: [{ _id: "3" }, { _id: "4" }] } } };
  });
  const res = await searchByOpenSearchIndexes(
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
    body: {
      query: {
        match: {
          content: {
            query: "foo",
          },
        },
      },
    },
  });
  expect(search).toBeCalledWith({
    index: "post_index",
    body: {
      query: {
        match: {
          title: {
            query: "bar",
          },
        },
      },
    },
  });
  expect(res).toEqual({
    "AND.0.content": [1, 2],
    "AND.1.title": [3, 4],
  });
});

test("saveDocOnOpenSearch", async () => {
  const index = vi.fn();
  await saveDocOnOpenSearch(
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
    body: {
      title: "title",
      content: "content",
    },
  });
  expect(index).toBeCalledWith({
    index: "post_index_2",
    id: "A",
    body: {
      text: "text",
    },
  });
  expect(index).toBeCalledWith({
    index: "post_index_3",
    id: "A",
    body: {
      note: "note",
    },
  });
});

test("saveDocOnOpenSearch - Selected data is missing.", () => {
  expect(() =>
    saveDocOnOpenSearch(
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
    saveDocOnOpenSearch(
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

test("deleteDocOnOpenSearch", async () => {
  const _delete = vi.fn();
  await deleteDocOnOpenSearch(
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

test("deleteDocOnOpenSearch - Primary key is missing.", () => {
  expect(() =>
    deleteDocOnOpenSearch(
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

describe("openSearchFTS", async () => {
  const client = {
    index: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
  };
  const next = vi.fn();
  const dmmf = await getSampleDMMF();
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("findMany", async () => {
    client.search.mockReturnValue({
      body: {
        hits: {
          hits: [
            { _id: "1" },
            {
              _id: "2",
            },
          ],
        },
      },
    });

    const params = {
      action: "findMany",
      model: "Post",
      args: { where: { content: "fts:apple" } },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(client as unknown as Client, dmmf, {
      Post: {
        docId: "id",
        indexes: { content: "post_index" },
      },
    })(params, next);

    expect(next).toBeCalledWith({
      ...params,
      args: {
        where: { id: { in: [1, 2] } },
      },
    });
  });

  test("update - not sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "update",
      model: "Post",
      args: {
        where: { id: 1 },
        data: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(client as unknown as Client, dmmf, {
      Post: {
        docId: "id",
        indexes: { content: "post_index" },
      },
    })(params, next);

    expect(client.index).not.toBeCalled();
  });

  test("update - sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "update",
      model: "Post",
      args: {
        where: { id: 1 },
        data: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(
      client as unknown as Client,
      dmmf,
      {
        Post: {
          docId: "id",
          indexes: { content: "post_index" },
        },
      },
      { syncOn: ["update"] }
    )(params, next);

    expect(client.index).toBeCalledWith({
      index: "post_index",
      id: "1",
      body: {
        content: "this is content",
      },
    });
  });

  test("upsert - not sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "upsert",
      model: "Post",
      args: {
        where: { id: 1 },
        create: { title: "this is title", content: "this is content" },
        update: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(client as unknown as Client, dmmf, {
      Post: {
        docId: "id",
        indexes: { content: "post_index" },
      },
    })(params, next);

    expect(client.index).not.toBeCalled();
  });

  test("upsert - sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "upsert",
      model: "Post",
      args: {
        where: { id: 1 },
        create: { title: "this is title", content: "this is content" },
        update: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(
      client as unknown as Client,

      dmmf,
      {
        Post: {
          docId: "id",
          indexes: { content: "post_index" },
        },
      },
      { syncOn: ["upsert"] }
    )(params, next);

    expect(client.index).toBeCalledWith({
      index: "post_index",
      id: "1",
      body: {
        content: "this is content",
      },
    });
  });

  test("create - not sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "create",
      model: "Post",
      args: {
        where: { id: 1 },
        data: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(client as unknown as Client, dmmf, {
      Post: {
        docId: "id",
        indexes: { content: "post_index" },
      },
    })(params, next);

    expect(client.index).not.toBeCalled();
  });

  test("create - sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "create",
      model: "Post",
      args: {
        where: { id: 1 },
        data: { title: "this is title", content: "this is content" },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(
      client as unknown as Client,

      dmmf,
      {
        Post: {
          docId: "id",
          indexes: { content: "post_index" },
        },
      },
      { syncOn: ["create"] }
    )(params, next);

    expect(client.index).toBeCalledWith({
      index: "post_index",
      id: "1",
      body: {
        content: "this is content",
      },
    });
  });

  test("delete - not sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "delete",
      model: "Post",
      args: {
        where: { id: 1 },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(client as unknown as Client, dmmf, {
      Post: {
        docId: "id",
        indexes: { content: "post_index" },
      },
    })(params, next);

    expect(client.index).not.toBeCalled();
  });

  test("delete - sync", async () => {
    next.mockReturnValue({
      id: 1,
      title: "this is title",
      content: "this is content",
    });

    const params = {
      action: "delete",
      model: "Post",
      args: {
        where: { id: 1 },
      },
    } as Prisma.MiddlewareParams;
    await openSearchFTS(
      client as unknown as Client,
      dmmf,
      {
        Post: {
          docId: "id",
          indexes: { content: "post_index" },
        },
      },
      { syncOn: ["delete"] }
    )(params, next);

    expect(client.delete).toBeCalledWith({
      index: "post_index",
      id: "1",
    });
  });
});

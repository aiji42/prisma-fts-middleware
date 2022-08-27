[![codecov](https://codecov.io/gh/aiji42/prisma-fts-middleware/branch/main/graph/badge.svg?token=1CD69HJ95D)](https://codecov.io/gh/aiji42/prisma-fts-middleware)

![prisma-fts](https://github.com/aiji42/prisma-fts-middleware/blob/main/images/hero.png?raw=true)

# @prisma-fts/opensearch

This is an enhancement library that allows PrismaClient to perform full-text search of OpenSearch.

## Setup

It is assumed that you have already set up prisma and prepared your index mappings on OpenSearch.

```bash
yarn add @opensearch-project/opensearch @prisma-fts/opensearch
```

Suppose we have the following `Person` model and further assume that OpenSearch has a `person_index` index mapping with `name` and `descriptin` as text data and `id` as `_id` (document key).

```prisma
model Person {
  id         Int     @id @default(autoincrement())
  name       String
  descriptin String
  age        Int
  country    String
}
```

```ts
import { PrismaClient, Prisma } from "@prisma/client";
import { openSearchFTS } from "@prisma-fts/opensearch";
import { Client } from "@opensearch-project/opensearch";

const osClient = new Client({ /* your client option */ });

const prisma = new PrismaClient();
const middleware = openSearchFTS(
  osClient,
  Prisma.dmmf,
  {
    Person: {
      docId: "id",
      indexes: {
        nane: "person_index",
        description: "person_index",
      }
    },
  }
)
prisma.$use(middleware);
```

## How to use

You can search for records via OpenSearch by setting search keywords to the columns specified in the index mapping by prefixing them with `fts:`.

```ts
await prisma.person.findMany({
  where: { 
    description: "fts:appple ceo",
                      // ^ it's typo
  },
});

/*
[
  {
    id: 1,
    title: "Steve Jobs",
    description: "Steven Paul Jobs was an American entrepreneur, ... He was the co-founder, the chairman, and CEO of Apple; ...and more",
    age: 56,
    country: "US"
  }
]
*/
```

**Note: It is important to prefix it with `fts:`.**  
Without it, the query will be directed to a regular database.

If you do a search with a `fts:` prefix, it will bypass that keyword to OpenSearch for a full-text search. Based on the ID of the object obtained by that search, you can retrieve the actual data by searching the original database.

## `openSearchFTS`

Configure the mapping of indexes to be used, synchronization of documents, etc.  
The return value of the `openSearchFTS` is used to set the prisma middleware (`.$use`).

```ts
prisma.$use(openSearchFTS(client, dmmf, indexes, options));
```

#### Params

##### `clietn` (required)

Set your OpenSearch client instance.

##### `dmmf` (required)

Need `dmmf` of `Prisma` module exported from `@prisma/client`.

```ts
import { Prisma } from "@prisma/client"
// Prisma.dmmf
```

##### `indexes` (required)

Mapping of indexes to be linked to OpenSearch.  
The first level is an object with the model name as the key and the index mapping object as the value.  
Index mapping has the following members.

- `docId`: Primary key name of the table, such as `id`.
- `indexes`: Object with column name as key and OpenSearch index name as value.

```ts
prisma.$use(
  openSearchFTS(
    osClient,
    Prisma.dmmf,
    {
      [modelName1]: {
        docId: "primaryKey (id column)",
        indexes: {
          [columnName1]: "your_index_name",
          [columnName2]: "your_index_name",
        },
      },
      [modelName2]: {
        docId: "primaryKey (id column)",
        indexes: {
          [columnName1]: "your_index_name",
          [columnName2]: "your_index_name",
        },
      },
    }
  )
);
```

```ts
// example

/*
model Post {
  id            Int      @id @default(autoincrement())
  title         String
  content       String
  published     Boolean
  publishedAt   DateTime
}

model Mail {
  code          String   @id @default(uuid())
  from          String
  to            String
  subject       String
  body          String
  sentAt        DateTime @default(now())
}
*/

prisma.$use(
  openSearchFTS(
    osClient,
    Prisma.dmmf,
    {
      Post: {
        docId: "id",
        indexes: {
          content: "post_index",
        },
      },
      Mail: {
        docId: "code",
        indexes: {
          subject: "email_index",
          body: "email_index",
        },
      },
    }
  )
);
```

##### `options` (optional)

- `syncOn` (optional): `Array<"create" | "update" | "upsert" | "delete">`
    - Set `syncOn` to synchronize indexes when creating, updating, or deleting records.
```ts
prisma.$use(
  openSearchFTS(
    osClient,
    Prisma.dmmf,
    {
      Post: {
        docId: "id",
        content: "post_index",
      },
    },
    {
      syncOn: ["create", "update", "upsert", "delete"]
    }
  )
);

// The new document is added to the post index.
await prisma.post.create({ data: { content: "..." } });

// Updates the document with _id of "xxxxxx".
await prisma.post.update({ where: { id: "xxxxxx" }, data: { content: "..." } });

// Deletes the document with _id is "xxxxxx".
await prisma.post.delete({ where: { id: "xxxxxx" } });
```

**Note: Operations on multiple records such as `createMany`, `upadateMany`, and `deleteMany` are not supported.**  
It is recommended to synchronize the database and OpenSearch directly using a database trigger function etc.

## Advanced Usage

It is possible to pass [optional query fields](https://opensearch.org/docs/latest/opensearch/query-dsl/full-text/#optional-query-fields) as JSON format after keywords when searching.

```ts
await prisma.person.findMany({
  where: { 
    description: "fts:cats dogs" + JSON.stringify({ operator: "and" })
  },
  // This is the same as 
  // osClient.search({ 
  //   index: "post_index",
  //   body: {
  //     query: {
  //       match: {
  //         description: {
  //           query: "cats dogs",
  //           operator: "and",
  //         },
  //       }
  //     }
  //   }
  // }).
});
```

It can be used in combination with other prisma search parameters such as `where` and `select`.

```ts
await prisma.person.findMany({
  where: {
    description: "fts:Steve",
    age: { gte: 60 },
  },
});
```

```ts
await prisma.post.findMany({
  select: {
    id: true,
    author: true,
    title: true,
    createdAt: true,
  },
  where: {
    OR: [
      { description: "fts:apple" },
      { description: "fts:orange" },   
    ],
    tags: {
      some: { name: "fruits" }
    }, 
  },
});
```

## Contributing
Please read [CONTRIBUTING.md](https://github.com/aiji42/prisma-fts-middleware/tree/main/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License
This project is licensed under the MIT License - see the [LICENSE](https://github.com/aiji42/prisma-fts-middleware/tree/main/LICENSE) file for details
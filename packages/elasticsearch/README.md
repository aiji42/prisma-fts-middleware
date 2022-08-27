[![codecov](https://codecov.io/gh/aiji42/prisma-fts-middleware/branch/main/graph/badge.svg?token=1CD69HJ95D)](https://codecov.io/gh/aiji42/prisma-fts-middleware)
[![npm version](https://badge.fury.io/js/@prisma-fts%2Felasticsearch.svg)](https://badge.fury.io/js/@prisma-fts%2Felasticsearch)

![prisma-fts](https://github.com/aiji42/prisma-fts-middleware/blob/main/images/hero.png?raw=true)

# @prisma-fts/elasticsearch

This is an enhancement library that allows PrismaClient to perform full-text search of Elasticsearch.

## Setup

It is assumed that you have already set up prisma and prepared your index mappings on Elasticsearch.

```bash
yarn add  @elastic/elasticsearch @prisma-fts/elasticsearch
```

Suppose we have the following `Person` model and further assume that Elasticsearch has a `person_index` index mapping with `name` and `descriptin` as text data and `id` as `_id` (document key).

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
import { elasticsearchFTS } from "@prisma-fts/elasticsearch";
import { Client } from "@elastic/elasticsearch";

const esClient = new Client({ /* your client option */ });

const prisma = new PrismaClient();
const middleware = elasticsearchFTS(
  esClient,
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

You can search for records via Elasticsearch by setting search keywords to the columns specified in the index mapping by prefixing them with `fts:`.

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

If you do a search with a `fts:` prefix, it will bypass that keyword to Elasticsearch for a full-text search. Based on the ID of the object obtained by that search, you can retrieve the actual data by searching the original database.

## `elasticsearchFTS`

Configure the mapping of indexes to be used, synchronization of documents, etc.  
The return value of the `elasticsearchFTS` is used to set the prisma middleware (`.$use`).

```ts
prisma.$use(elasticsearchFTS(client, dmmf, indexes, options));
```

#### Params

##### `clietn` (required)

Set your elasticsearch client instance.

##### `dmmf` (required)

Need `dmmf` of `Prisma` module exported from `@prisma/client`.

```ts
import { Prisma } from "@prisma/client"
// Prisma.dmmf
```

##### `indexes` (required)

Mapping of indexes to be linked to Elasticsearch.  
The first level is an object with the model name as the key and the index mapping object as the value.  
Index mapping has the following members.

- `docId`: Primary key name of the table, such as `id`.
- `indexes`: Object with column name as key and Elasticsearch index name as value.

```ts
prisma.$use(
  elasticsearchFTS(
    esClient,
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
  elasticsearchFTS(
    esClient,
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
  elasticsearchFTS(
    esClient,
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
It is recommended to synchronize the database and Elasticsearch directly using a database trigger function etc.

## Advanced Usage

It is possible to pass [search api parameters](https://github.com/elastic/elasticsearch-js/blob/main/src/api/types.ts#L5253) as JSON format after keywords when searching.

```ts
await prisma.person.findMany({
  where: { 
    description: "fts:cats dogs" + JSON.stringify({ operator: "and" })
  },
  // This is the same as 
  // esClient.search({ 
  //   index: "post_index",
  //   query: {
  //     match: {
  //       description: {
  //         query: "cats dogs",
  //         operator: "and",
  //       },
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
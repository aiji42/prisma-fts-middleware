# @prisma-fts/algolia

This is an enhancement library that allows PrismaClient to perform full-text search of Algolia.

## Setup

It is assumed that you have already set up prisma and prepared your application and index in Algolia.

```bash
yarn add algoliasearch @prisma-fts/algolia
```

Suppose we have the following `Person` model and further assume that Algolia has a `person` index with `name` and `descriptin` as text data and `id` as `objectID`.

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
import { algoliaFTS } from "@prisma-fts/algolia";
import algolia from "algoliasearch";

const algoliaClient = algoliasearch("YourApplicationID", "YourAdminAPIKey");

const prisma = new PrismaClient();
const middleware = algoliaFTS(
  Prisma.dmmf,
  {
    Person: {
      objectID: 'id',
      indexes: {
        nane: algoliaClient.initIndex("person"),
        description: algoliaClient.initIndex("person"),
      }
    },
  },
  {
    syncOn: ["create", "update", "delete"]
  }
)
prisma.$use(middleware);
```

## How to use

You can search for records via Algolia by setting search keywords to the columns specified in the index mapping by prefixing them with `fts:`.

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

If you do a search with a `fts:` prefix, it will bypass that keyword to Algolia for a full-text search. Based on the ID of the object obtained by that search, you can retrieve the actual data by searching the original database.

## `algoliaFTS`

Configure the mapping of indexes to be used, synchronization of index objects, etc.  
The return value of the `algoliaFTS` is used to set the prisma middleware (`.$use`).

```ts
prisma.$use(algoliaFTS(dmmf, indexes, options));
```

#### Params

##### `dmmf` (required)

Need `dmmf` of `Prisma` module exported from `@prisma/client`.

```ts
import { Prisma } from '@prisma/client'
// Prisma.dmmf
```

##### `indexes` (required)

Mapping of indexes to be linked to Algolia.  
The first level is an object with the model name as the key and the index mapping object as the value.  
Index mapping has the following members.

- `objectID`: Primary key name of the table, such as `id`.
- `indexes`: Object with column name as key and Algolia index as value.

```ts
prisma.$use(
  algoliaFTS(
    Prisma.dmmf,
    {
      [modelName1]: {
        objectID: 'primaryKey (id column)',
        indexes: {
          [columnName1]: algoliaClient.initIndex("yourIndexName"),
          [columnName2]: algoliaClient.initIndex("yourIndexName"),
        },
      },
      [modelName2]: {
        objectID: 'primaryKey (id column)',
        indexes: {
          [columnName1]: algoliaClient.initIndex("yourIndexName"),
          [columnName2]: algoliaClient.initIndex("yourIndexName"),
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
  algoliaFTS(
    Prisma.dmmf,
    {
      Post: {
        objectID: 'id',
        indexes: {
          content: algoliaClient.initIndex("post"),
        },
      },
      Mail: {
        objectID: 'code',
        indexes: {
          subject: algoliaClient.initIndex("mail"),
          body: algoliaClient.initIndex("mail"),
        },
      },
    }
  )
);
```

##### `options` (optional)

- `syncOn` (optional): `Array<"create" | "update" | "delete">`
   - Set `syncOn` to synchronize indexes when creating, updating, or deleting records.
```ts
prisma.$use(
  algoliaFTS(
    Prisma.dmmf,
    {
      Post: {
        content: algoliaClient.initIndex("post"),
      },
    },
    {
      syncOn: ["create", "update", "delete"]
    }
  )
);

// The new object is added to the post index.
await prisma.post.create({ data: { content: "..." } });

// Updates the index object with objectID of "xxxxxx".
await prisma.post.update({ where: { id: "xxxxxx" }, data: { content: "..." } });

// Deletes the index object with objectID is "xxxxxx".
await prisma.post.delete({ where: { id: "xxxxxx" } });
```

**Note: Operations on multiple records such as `createMany`, `upadateMany`, and `deleteMany` are not supported.**  
It is recommended to synchronize the database and Algolia directly using a database trigger function etc.

## Advanced Usage

It is possible to pass [search api parameters](https://www.algolia.com/doc/api-reference/search-api-parameters/) as JSON format after keywords when searching.

```ts
await prisma.person.findMany({
  where: { 
    description: "fts:スティーブジョブス" + JSON.stringify({ queryLanguages: ["ja"] })
  },
  // This is the same as `index.search("スティーブ・ジョブス", { queryLanguages: ["ja"] })`.
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
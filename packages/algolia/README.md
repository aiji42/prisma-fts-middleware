# @prisma-fts/algolia

This is an enhancement library that allows PrismaClient to perform full-text search of Algolia.

## Setup

It is assumed that you have already set up prisma and prepared your application and index in Algolia.

```bash
yarn add algoliasearch @prisma-fts/algolia
```

Suppose we have the following `Person` model and further assume that Algolia has a `person` index with `name` and `descriptin` as text data and `id` as `objectId`.

```prisma
model Person {
  id         Int     @id @default(autoincrement())
  name       String
  descriptin String
}
```

```ts
import { PrismaClient } from "@prisma/client";
import { algoliaFTS } from "@prisma-fts/algolia";
import algolia from "algoliasearch";

const algoliaClient = algoliasearch("YourApplicationID", "YourAdminAPIKey");

const prisma = new PrismaClient();
prisma.$use(
  algoliaFTS(
    {
      Person: {
        nane: algoliaClient.initIndex("person"),
        description: algoliaClient.initIndex("person"),
      },
    },
    {
      pKeys: { Person: { name: "id", isNumber: true } }
    },
  )
);
```

## How to use

```ts
await prisma.person.findMany({
  where: { 
    content: 'fts:appple'
    //               ^ typo
  },
});

/*
[
  {
    id: 1,
    title: "Steve Jobs",
    description: "Steven Paul Jobs was an American entrepreneur, ... He was the co-founder, the chairman, and CEO of Apple; ...and more"
  }
]
*/
```

You can search for records via Algolia by setting search keywords to the columns specified in the index mapping by prefixing them with `fts:`.

## `algoliaFTS`

Configure the mapping of indexes to be used, synchronization of index objects, etc.  
The return value of the `algoliaFTS` is used to set the prisma middleware (`.$use`).

```ts
prisma.$use(algoliaFTS(indexes, options));
```

#### Params

##### `indexes` (required)

```ts
prisma.$use(
  algoliaFTS({
    [modelName1]: {
      [columnName1]: algoliaClient.initIndex("yourIndexName"),
      [columnName2]: algoliaClient.initIndex("yourIndexName"),
    },
    [modelName2]: {
      [columnName1]: algoliaClient.initIndex("yourIndexName"),
      [columnName2]: algoliaClient.initIndex("yourIndexName"),
    },
  })
);

// example
prisma.$use(
  algoliaFTS({
    Post: {
      content: algoliaClient.initIndex("post"),
    },
    Mail: {
      subject: algoliaClient.initIndex("mail"),
      body: algoliaClient.initIndex("mail"),
    },
  })
);
```

##### `options` (optional)

- `syncOn` (optional): `Array<"create" | "update" | "delete">`
   - Set `syncOn` to synchronize indexes when creating, updating, or deleting records.
```ts
prisma.$use(
  algoliaFTS(
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
await prisma.post.create({ data: { content: '...' } });

// Updates the index object with objectId of 'xxxxxx'.
await prisma.post.update({ where: { id: 'xxxxxx' }, data: { content: '...' } });

// Deletes the index object with objectId is 'xxxxxx'.
await prisma.post.delete({ where: { id: 'xxxxxx' } });
```

**Note: Operations on multiple records such as `createMany`, `upadateMany`, and `deleteMany` are not supported.**  
It is recommended to synchronize the database and Algolia directly using a database trigger function etc.

- `pKeys` (optional): `Record<Prisma.ModelName, { name: string; inNumber?: boolean }>`
    - Set `pKeys` if the model you wish to target for full-text search has a primary key name that is not `id` or a type that is not `string`.
```ts
prisma.$use(
  algoliaFTS(
    {
      Post: {
        content: algoliaClient.initIndex("post"),
      },
      Mail: {
        subject: algoliaClient.initIndex("mail"),
        body: algoliaClient.initIndex("mail"),
      },
    },
    {
      pKeys: {
        Post: { name: "id", isNumber: true },
        Mail: { name: "code", isNumber: false }
        // it can be imitted; `[model]: { name: 'id', isNumber: false }`
      }
    }
  )
);
```
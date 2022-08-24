import { PrismaClient, Prisma } from "@prisma/client";
import { elasticSearchClient } from "./elasticSearchClient";
import { elasticsearchFTS } from "@prisma-fts/elasticsearch";

export const prisma = new PrismaClient();

const middleware = elasticsearchFTS(
  elasticSearchClient,
  Prisma.dmmf,
  {
    Post: {
      objectID: "id",
      indexes: {
        title: "post_index",
        content: "post_index",
      },
    },
  },
  {
    syncOn: ["create", "update", "delete", "upsert"],
  }
);

prisma.$use(middleware);

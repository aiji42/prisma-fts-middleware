import { PrismaClient, Prisma } from "@prisma/client";
import { openSearchClient } from "./openSearchClient";
import { openSearchFTS } from "@prisma-fts/opensearch";

export const prisma = new PrismaClient();

const middleware = openSearchFTS(
  openSearchClient,
  Prisma.dmmf,
  {
    Post: {
      docId: "id",
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

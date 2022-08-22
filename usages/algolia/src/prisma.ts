import { PrismaClient, Prisma } from "@prisma/client";
import { algoliaFTS } from "@prisma-fts/algolia";
import { algoliaClient } from "./algoliaClient";

export const prisma = new PrismaClient();
const middleware = algoliaFTS(
  Prisma.dmmf,
  {
    Post: {
      objectID: "id",
      indexes: {
        title: algoliaClient.initIndex("post"),
        content: algoliaClient.initIndex("post"),
      },
    },
  },
  {
    syncOn: ["create", "update", "delete"],
  }
);
prisma.$use(middleware);

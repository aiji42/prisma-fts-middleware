import { PrismaClient } from "@prisma/client";
import { algoliaFTS } from "@prisma-fts/algolia";
import { algoliaClient } from "./algoliaClient";

export const prisma = new PrismaClient();
prisma.$use(
  algoliaFTS({
    Post: {
      title: algoliaClient.initIndex("post"),
      content: algoliaClient.initIndex("post"),
    },
  })
);

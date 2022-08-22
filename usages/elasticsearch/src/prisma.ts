import { PrismaClient, Prisma } from "@prisma/client";
// import { algoliaFTS } from "@prisma-fts/algolia";
export { elasticSearchClient } from "./elasticSearchClient";

export const prisma = new PrismaClient();
// const middleware = algoliaFTS(
//   Prisma.dmmf,
//   {
//     Post: {
//       objectID: "id",
//       indexes: {
//         title: elasticSearchClient.initIndex("post"),
//         content: elasticSearchClient.initIndex("post"),
//       },
//     },
//   },
//   {
//     syncOn: ["create", "update", "delete", "upsert"],
//   }
// );
// prisma.$use(middleware);

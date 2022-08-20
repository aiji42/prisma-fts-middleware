import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import algolia from "algoliasearch";
import { algoliaFTS } from "@prisma-fts/algolia";

const algoliaClient = algolia(
  process.env.ALGOLIA_APPLICATION_ID ?? "",
  process.env.ALGOLIA_ADMIN_API_KEY ?? ""
);

const prisma = new PrismaClient();
prisma.$use(
  algoliaFTS({
    Post: {
      title: algoliaClient.initIndex("post"),
      content: algoliaClient.initIndex("post"),
    },
  })
);

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      AND: [{ content: "fts:ぎんが" }, { content: "fts:じょばんに" }],
    },
  });
  console.log(posts);
};

main();

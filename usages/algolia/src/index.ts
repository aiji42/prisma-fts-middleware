import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import algolia, { SearchIndex } from "algoliasearch";
import { algoliaFTS } from "@prisma-fts/algolia";

const algoliaClient = algolia(
  process.env.ALGOLIA_APPLICATION_ID ?? "",
  process.env.ALGOLIA_ADMIN_API_KEY ?? ""
);

const indexes: Record<Prisma.ModelName, Record<string, SearchIndex>> = {
  Post: {
    title: algoliaClient.initIndex("post"),
    content: algoliaClient.initIndex("post"),
  },
};

const prisma = new PrismaClient();
prisma.$use(algoliaFTS(indexes));

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      AND: [{ content: "fts:銀河" }, { content: "fts:ジョバンニ" }],
    },
  });
  console.log(posts);
};

main();

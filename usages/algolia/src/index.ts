import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import algolia from "algoliasearch";

const algoliaClient = algolia(
  process.env.ALGOLIA_APPLICATION_ID ?? "",
  process.env.ALGOLIA_ADMIN_API_KEY ?? ""
);
const index = algoliaClient.initIndex("post");

const prisma = new PrismaClient();
prisma.$use(async (params, next) => {
  if (params.action.startsWith("find")) {
    const res = await index
      .search(params.args.where.content.contains)
      .catch(console.error);
    if (res) {
      params.args.where = {
        id: { in: res.hits.map(({ objectID }) => Number(objectID)) },
      };
    }
  }
  return next(params);
});

const main = async () => {
  const posts = await prisma.post.findMany({
    where: { content: { contains: "まるで" } },
  });
  console.log(posts);
};

main();

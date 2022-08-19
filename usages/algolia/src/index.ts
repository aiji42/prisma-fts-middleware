import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import algolia from "algoliasearch";
import { getSearchStringMapping, getNewWhereArg } from "@prisma-fts/algolia";

const algoliaClient = algolia(
  process.env.ALGOLIA_APPLICATION_ID ?? "",
  process.env.ALGOLIA_ADMIN_API_KEY ?? ""
);
const index = algoliaClient.initIndex("post");

const columns = ["title", "content"];

const prisma = new PrismaClient();
prisma.$use(async (params, next) => {
  if (!params.action.startsWith("find") || !params.args.where)
    return next(params);

  const searches = getSearchStringMapping(columns, params.args.where);
  console.log(searches);

  const searched = Object.fromEntries(
    await Promise.all(
      Object.entries(searches).map(async ([key, val]) => {
        const res = await index.search(val).catch(console.error);
        if (res) {
          return [key, res.hits.map(({ objectID }) => Number(objectID))];
        }
        return [key, undefined];
      })
    )
  );

  console.dir(getNewWhereArg(params.args.where, searched), { depth: 10 });

  return next({
    ...params,
    args: {
      ...params.args,
      where: getNewWhereArg(params.args.where, searched),
    },
  });
});

const main = async () => {
  const posts = await prisma.post.findMany({
    where: { OR: [{ content: "fts:ぎんが" }, { content: "fts:ねこ" }] },
  });
  console.log(posts);
};

main();

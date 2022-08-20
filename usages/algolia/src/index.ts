import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import algolia, { SearchIndex } from "algoliasearch";
import {
  getSearchStringMapping,
  getNewWhereArg,
  searchByAlgoliaIndexes,
} from "@prisma-fts/algolia";

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
prisma.$use(async (params, next) => {
  if (
    params.action.startsWith("find") &&
    params.args.where &&
    params.model &&
    indexes[params.model]
  ) {
    params.args.where = getNewWhereArg(
      params.args.where,
      await searchByAlgoliaIndexes(
        indexes[params.model],
        getSearchStringMapping(
          Object.keys(indexes[params.model]),
          params.args.where
        ),
        true
      )
    );
    return next(params);
  }

  return next(params);
});

const main = async () => {
  const posts = await prisma.post.findMany({
    where: { AND: [{ content: "fts:銀河" }, { content: "fts:ねこ" }] },
  });
  console.log(posts);
};

main();

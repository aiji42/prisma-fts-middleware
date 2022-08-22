import { prisma, elasticSearchClient } from "./prisma";

const main = async () => {
  await elasticSearchClient.index({
    index: "game-of-thrones",
    document: {
      character: "Ned Stark",
      quote: "Winter is coming.",
    },
  });

  await elasticSearchClient.index({
    index: "game-of-thrones",
    document: {
      character: "Daenerys Targaryen",
      quote: "I am the blood of the dragon.",
    },
  });

  await elasticSearchClient.index({
    index: "game-of-thrones",
    document: {
      character: "Tyrion Lannister",
      quote: "A mind needs books like a sword needs a whetstone.",
    },
  });

  // here we are forcing an index refresh, otherwise we will not
  // get any result in the consequent search
  await elasticSearchClient.indices.refresh({ index: "game-of-thrones" });

  // Let's search!
  const result = await elasticSearchClient.search({
    index: "game-of-thrones",
    query: {
      match: { quote: "winter" },
    },
  });

  console.log(result.hits.hits);

  // const posts = await prisma.post.findMany({
  //   where: {
  //     AND: [{ content: "fts:ぎんが" }, { content: `fts:カンパネラ` }],
  //   },
  // });
  // console.log(posts);
};

main();

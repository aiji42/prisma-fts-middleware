import { prisma } from "./prisma";

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      AND: [{ content: "fts:ぎんが" }, { content: `fts:カンパネラ` }],
    },
  });
  console.log(posts);
};

main();

import { prisma } from "./prisma";

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      OR: [{ content: "fts:ねこ" }, { content: `fts:カンパネラ` }],
    },
  });
  console.log(posts);
};

main();

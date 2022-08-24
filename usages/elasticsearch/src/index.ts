import { prisma } from "./prisma";

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      AND: [{ content: "fts:ギンガ" }],
    },
  });
  console.log(posts);
};

main();

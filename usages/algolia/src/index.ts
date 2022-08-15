import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const posts = await prisma.post.findMany({
    where: { content: { contains: "みんな" } },
  });
  console.log(posts);
};

main();

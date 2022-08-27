import { prisma } from "./prisma";

const main = async () => {
  const posts = await prisma.post.findMany({
    where: {
      AND: [
        {
          content:
            "fts:ぼんやり ジョバンニ" + JSON.stringify({ operator: "and" }),
        },
      ],
    },
  });
  console.log(posts);
};

main();

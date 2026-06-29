import prisma from "./src/lib/prisma";
prisma.newsletterSubscription.deleteMany({ where: { email: "vietnm.oes@gmail.com" } })
  .then(() => { console.log("Deleted!"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });

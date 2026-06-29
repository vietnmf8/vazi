import "dotenv/config";
import prisma from "./src/lib/prisma";

async function main() {
  const all = await prisma.visaApplication.findMany({
    select: { id: true, applicationCode: true, contactEmail: true, sequenceNo: true }
  });
  console.log("ALL:", all);
  
  // Delete all except vietnm.oes@gmail.com
  const toDelete = all.filter(a => a.contactEmail !== "vietnm.oes@gmail.com" && a.sequenceNo !== 1);
  if (toDelete.length > 0) {
    const ids = toDelete.map(a => a.id);
    await prisma.visaApplication.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`Deleted ${ids.length} records.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

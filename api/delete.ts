import { config } from 'dotenv';
config();

async function main() {
  const { default: prisma } = await import('./src/lib/prisma.js');
  await prisma.nlpUtterance.deleteMany({
      where: { text: 'Xin chào' }
  });
  console.log("Deleted Xin chao");
}

main().catch(console.error).finally(() => process.exit(0));

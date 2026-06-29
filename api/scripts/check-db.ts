import prisma from '../src/lib/prisma';
async function main() {
  const msgs = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(msgs.map(m => ({
    id: m.id,
    senderType: m.senderType,
    originalText: m.originalText,
    translatedText: m.translatedText,
    originalLanguage: m.originalLanguage
  })));
}
main();

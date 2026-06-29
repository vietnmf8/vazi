import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('Seeding Reels and Reactions...');

  // Clear existing reels and reactions
  await prisma.reelReaction.deleteMany();
  await prisma.reel.deleteMany();

  const reels = [
    {
      title: 'Customer Feedback from John Doe',
      authorName: 'John Doe',
      authorAvatar: 'https://i.pravatar.cc/150?u=1',
      media: [
        { id: '1', type: 'image', url: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop', duration: 5 }
      ]
    },
    {
      title: 'Visa Process Explained',
      authorName: 'Sarah Smith',
      authorAvatar: 'https://i.pravatar.cc/150?u=2',
      media: [
        { id: '2', type: 'image', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop', duration: 5 },
        { id: '3', type: 'image', url: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?q=80&w=2070&auto=format&fit=crop', duration: 5 }
      ]
    },
    {
      title: 'Arriving in Vietnam',
      authorName: 'Michael Lee',
      authorAvatar: 'https://i.pravatar.cc/150?u=3',
      media: [
        { id: '4', type: 'image', url: 'https://images.unsplash.com/photo-1555921015-5532091f6026?q=80&w=2070&auto=format&fit=crop', duration: 5 }
      ]
    },
    {
      title: 'Beautiful Ha Long Bay',
      authorName: 'Emily Chen',
      authorAvatar: 'https://i.pravatar.cc/150?u=4',
      media: [
        { id: '5', type: 'image', url: 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=2070&auto=format&fit=crop', duration: 5 }
      ]
    }
  ];

  for (const reelData of reels) {
    const reel = await prisma.reel.create({
      data: reelData
    });

    // Add some random reactions
    const emojis = ['❤️', '👍', '😆', '😲'];
    const numReactions = Math.floor(Math.random() * 5) + 1; // 1 to 5 reactions

    for (let i = 0; i < numReactions; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      await prisma.reelReaction.create({
        data: {
          reelId: reel.id,
          emoji,
          guestId: `guest_${Math.floor(Math.random() * 1000)}`
        }
      });
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

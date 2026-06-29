import { ReelGroup } from '@/types/reel';

export const mockReels: ReelGroup[] = [
  {
    id: '1',
    title: 'MG <3',
    coverImage: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b', // demo url
    author: {
      name: 'Đới Đức Duy',
      avatar: 'https://i.pravatar.cc/150?u=1'
    },
    createdAt: new Date().toISOString(),
    media: [
      { id: 'm1', url: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b', type: 'image' },
      { id: 'm2', url: 'https://images.unsplash.com/photo-1542204642-17730e70ab2e', type: 'image' }
    ]
  },
  {
    id: '2',
    title: 'Results',
    coverImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
    author: {
      name: 'Nguyễn Văn A',
      avatar: 'https://i.pravatar.cc/150?u=2'
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    media: [
      { id: 'm3', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9', type: 'image' }
    ]
  }
];

export interface ReelAuthor {
  name: string;
  avatar: string;
}

export interface ReelMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
}

export interface ReelGroup {
  id: string;
  title: string;
  coverImage?: string;
  media: ReelMedia[];
  author: ReelAuthor;
  createdAt: string;
  updatedAt?: string;
  reactions?: { id: string; emoji: string; createdAt?: string }[];
}

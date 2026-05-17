// game.ts 
export interface Game { 
  id: string; 
  title: string; 
  thumbnail: string; 
  gameUrl: string; 
  category: string; 
  description: string; 
  isNew: boolean; 
  isFeatured: boolean; 
  videoUrl?: string;
  tags?: string;
  playCount?: number;
  createdAt: any; 
} 

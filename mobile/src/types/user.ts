// user.ts 
export interface User { 
  id: string; 
  name: string; 
  email: string; 
  totalScore: number; 
  gamesPlayed: number; 
  createdAt: any; // Will be Firebase Timestamp
}

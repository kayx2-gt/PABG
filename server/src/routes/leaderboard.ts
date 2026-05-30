import { Router } from 'express';
import { db } from '../lib/firebase';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .orderBy('totalPoints', 'desc')
      .limit(100)
      .get();
    
    const usersMap = new Map();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = (data.email || '').toLowerCase().trim();
      
      // Filter out Guest Mode users (@mobalauncher.com)
      if (email.endsWith('@mobalauncher.com')) {
        return;
      }

      const totalPoints = data.totalPoints || 0;
      // If no points, skip
      if (totalPoints <= 0) return;

      const key = email || doc.id;
      
      if (!usersMap.has(key) || totalPoints > usersMap.get(key).totalPoints) {
        const totalSeconds = data.totalTimePlayed || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        usersMap.set(key, {
          id: doc.id,
          name: data.name || 'Guest User',
          email: email || '',
          gamesPlayed: data.gamesPlayed || data.totalGamesPlayed || 0,
          totalTimePlayed: totalSeconds,
          formattedTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
          dailyGamesCount: data.dailyGamesCount || 0,
          totalPoints: totalPoints,
          totalScore: data.totalScore || 0,
          totalMissionsCompleted: data.totalMissionsCompleted || 0,
          missions: data.missions || {},
          dailyRandomGameTitle: data.dailyRandomGameTitle || 'Random Game',
          loginStreak: data.loginStreak || 1,
          totalUniqueGames: data.totalUniqueGames || 0,
          photoURL: data.photoURL || ''
        });
      }
    });
    
    const leaderboard = Array.from(usersMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 20);
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;

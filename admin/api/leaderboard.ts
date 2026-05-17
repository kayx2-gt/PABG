import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase';
import { verifyToken } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await verifyToken(req as any, res))) return;

  try {
    const snapshot = await db.collection('users')
      .orderBy('totalPoints', 'desc')
      .limit(20)
      .get();

    const usersMap = new Map();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase().trim();
      const totalPoints = data.totalPoints || 0;
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
          totalPoints,
          totalScore: data.totalScore || 0,
          totalMissionsCompleted: data.totalMissionsCompleted || 0,
          missions: data.missions || {},
          dailyRandomGameTitle: data.dailyRandomGameTitle || 'Random Game',
          loginStreak: data.loginStreak || 1,
          totalUniqueGames: data.totalUniqueGames || 0,
          photoURL: data.photoURL || '',
        });
      }
    });

    const leaderboard = Array.from(usersMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 20);

    return res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

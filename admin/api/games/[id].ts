import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, increment, serverTimestamp } from '../_lib/firebase';
import { verifyToken, AuthRequest } from '../_lib/auth';

const GAMES_COLLECTION = 'games';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authReq = req as AuthRequest;
  if (!(await verifyToken(authReq, res))) return;

  const { id } = req.query; // /api/games/[id]

  // GET /api/games/[id]
  if (req.method === 'GET') {
    try {
      const doc = await db.collection(GAMES_COLLECTION).doc(id as string).get();
      if (!doc.exists) return res.status(404).json({ error: 'Game not found' });
      return res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch game' });
    }
  }

  // POST /api/games/[id]/play  — id here is the game id, action from query
  if (req.method === 'POST') {
    const uid = authReq.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const gameDoc = await db.collection(GAMES_COLLECTION).doc(id as string).get();
      if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });
      const gameData = gameDoc.data();

      const batch = db.batch();
      const gameRef = db.collection(GAMES_COLLECTION).doc(id as string);
      batch.set(gameRef, { playCount: increment(1) }, { merge: true });

      const historyRef = db.collection('users').doc(uid).collection('history').doc(id as string);
      batch.set(historyRef, { ...gameData, id, playedAt: serverTimestamp() });

      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const dailyGames = (userData.dailyGamesCount || 0) + 1;
        const totalGames = (userData.totalGamesPlayed || 0) + 1;
        const missions = userData.missions || {};
        const updates: any = {
          dailyGamesCount: increment(1),
          totalGamesPlayed: increment(1),
        };

        if (dailyGames >= 10 && missions.games10?.status === 'pending') updates['missions.games10.status'] = 'ready';
        if (dailyGames >= 15 && missions.games15?.status === 'pending') updates['missions.games15.status'] = 'ready';
        if (dailyGames >= 20 && missions.games20?.status === 'pending') updates['missions.games20.status'] = 'ready';

        if (id === userData.dailyRandomGameId && missions.randomGame5?.status === 'pending') {
          const progress = (missions.randomGame5.progress || 0) + 1;
          updates['missions.randomGame5.progress'] = progress;
          if (progress >= 5) updates['missions.randomGame5.status'] = 'ready';
        }

        if (totalGames >= 100 && missions.totalGames100?.status === 'pending') updates['missions.totalGames100.status'] = 'ready';

        const historySnapshot = await userRef.collection('history').get();
        updates.totalUniqueGames = historySnapshot.size;
        if (historySnapshot.size >= 20 && missions.variety20?.status === 'pending') updates['missions.variety20.status'] = 'ready';

        batch.update(userRef, updates);
      }

      await batch.commit();
      return res.json({ success: true });
    } catch (error) {
      console.error('Error recording play:', error);
      return res.status(500).json({ error: 'Failed to update play count' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

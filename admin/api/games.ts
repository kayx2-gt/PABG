import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, increment, serverTimestamp } from './_lib/firebase';
import { verifyToken, AuthRequest } from './_lib/auth';

const GAMES_COLLECTION = 'games';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authReq = req as AuthRequest;
  if (!(await verifyToken(authReq, res))) return;

  const { sub } = req.query;

  // GET /api/games?sub=recent
  if (sub === 'recent') {
    const uid = authReq.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const historySnapshot = await db
        .collection('users').doc(uid).collection('history')
        .orderBy('playedAt', 'desc').limit(10).get();
      if (historySnapshot.empty) return res.json([]);
      const historyItems = historySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const fullGames = await Promise.all(
        historyItems.map(async (item) => {
          const gameDoc = await db.collection(GAMES_COLLECTION).doc(item.id).get();
          return gameDoc.exists
            ? { id: gameDoc.id, ...gameDoc.data(), playedAt: item.playedAt }
            : item;
        })
      );
      return res.json(fullGames);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  }

  // GET /api/games?sub=featured
  if (sub === 'featured') {
    try {
      const snapshot = await db.collection(GAMES_COLLECTION).get();
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      games.sort((a: any, b: any) => (b.playCount || 0) - (a.playCount || 0));
      return res.json(games.slice(0, 10));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch featured games' });
    }
  }

  // GET /api/games?sub=new
  if (sub === 'new') {
    try {
      const snapshot = await db.collection(GAMES_COLLECTION).orderBy('createdAt', 'desc').get();
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(games);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch new games' });
    }
  }

  // GET /api/games?sub=category&cat=Action
  if (sub === 'category') {
    const { cat } = req.query;
    try {
      const snapshot = await db.collection(GAMES_COLLECTION)
        .where('category', '==', cat as string)
        .orderBy('createdAt', 'desc').get();
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(games);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch games by category' });
    }
  }

  // GET /api/games  — all games (no sub)
  try {
    const snapshot = await db.collection(GAMES_COLLECTION).orderBy('createdAt', 'desc').get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(games);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch games' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, serverTimestamp } from './_lib/firebase';
import { verifyToken, AuthRequest } from './_lib/auth';
import { requireActiveUser } from './_lib/requireActiveUser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authReq = req as AuthRequest;
  if (!(await verifyToken(authReq, res))) return;

  const uid = authReq.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { sub } = req.query; // 'toggle' | 'check'
  const { email } = req.query;
  const userEmailId = (email as string)?.toLowerCase().trim() || authReq.user?.email?.toLowerCase().trim() || null;
  const identifier = userEmailId || uid;

  // GET /api/favorites — get all favorites
  if (!sub && req.method === 'GET') {
    try {
      const snapshot = await db.collection('users').doc(identifier).collection('favorites').get();
      const favorites = snapshot.docs.map(doc => doc.data());
      return res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  }

  // POST /api/favorites?sub=toggle — toggle a favorite
  if (sub === 'toggle' && req.method === 'POST') {
    if (!(await requireActiveUser(authReq, res))) return;
    const { game, email: bodyEmail } = req.body;
    const bodyIdentifier = bodyEmail?.toLowerCase().trim() || uid;

    if (!game || !game.id) return res.status(400).json({ error: 'Missing game data' });

    try {
      const favRef = db.collection('users').doc(bodyIdentifier).collection('favorites').doc(game.id);
      const doc = await favRef.get();

      if (doc.exists) {
        await favRef.delete();
        return res.json({ success: true, isFavorite: false });
      } else {
        await favRef.set({ ...game, favoritedAt: serverTimestamp() });

        const userRef = db.collection('users').doc(bodyIdentifier);
        const favsSnapshot = await userRef.collection('favorites').get();
        if (favsSnapshot.size >= 10) {
          const userDoc = await userRef.get();
          const missions = userDoc.data()?.missions || {};
          if (missions.favorites10?.status === 'pending') {
            await userRef.update({ 'missions.favorites10.status': 'ready' });
          }
        }

        return res.json({ success: true, isFavorite: true });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  }

  // GET /api/favorites?sub=check&gameId=xxx — check if a game is favorited
  if (sub === 'check' && req.method === 'GET') {
    const { gameId } = req.query;
    try {
      const doc = await db.collection('users').doc(identifier).collection('favorites').doc(gameId as string).get();
      return res.json({ isFavorite: doc.exists });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check favorite' });
    }
  }

  return res.status(404).json({ error: 'Route not found' });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, serverTimestamp } from './_lib/firebase';
import { verifyToken } from './_lib/auth';
import { fetchGamesFromAPI } from './_lib/gamemonetize';

const GAMES_COLLECTION = 'games';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!(await verifyToken(req as any, res))) return;

  const { sub } = req.query;

  // GET /api/admin?sub=gamemonetize&category=0&num=20&page=1
  if (sub === 'gamemonetize' && req.method === 'GET') {
    const { category, num, page } = req.query;
    try {
      const games = await fetchGamesFromAPI(
        category as string,
        Number(num) || 20,
        Number(page) || 1
      );
      return res.json(games);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch from GameMonetize' });
    }
  }

  // POST /api/admin?sub=games — save a game to Firestore
  if (sub === 'games' && req.method === 'POST') {
    const gameData = req.body;
    try {
      const existing = await db.collection(GAMES_COLLECTION)
        .where('gameUrl', '==', gameData.gameUrl)
        .limit(1)
        .get();
      if (!existing.empty) {
        return res.status(400).json({ error: 'Game already exists in library' });
      }
      const docRef = await db.collection(GAMES_COLLECTION).add({
        ...gameData,
        createdAt: serverTimestamp(),
      });
      return res.json({ id: docRef.id, success: true });
    } catch (error: any) {
      console.error('Error saving game:', error);
      return res.status(500).json({ error: 'Failed to save game: ' + error.message });
    }
  }

  // PUT /api/admin?sub=games&id=xxx — edit a game
  if (sub === 'games' && req.method === 'PUT') {
    const { id } = req.query;
    try {
      await db.collection(GAMES_COLLECTION).doc(id as string).update(req.body);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update game' });
    }
  }

  // DELETE /api/admin?sub=games&id=xxx — delete a game
  if (sub === 'games' && req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await db.collection(GAMES_COLLECTION).doc(id as string).delete();
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete game' });
    }
  }

  // PUT /api/admin?sub=users&id=xxx — admin: update user name
  if (sub === 'users' && req.method === 'PUT') {
    const { id } = req.query;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    try {
      const userRef = db.collection('users').doc(id as string);
      const existing = await userRef.get();
      if (!existing.exists) return res.status(404).json({ error: 'User not found' });
      await userRef.update({ name: name.trim(), lastUpdated: serverTimestamp() });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // PATCH /api/admin?sub=suspension&id=xxx — admin: suspend/unsuspend user
  if (sub === 'suspension' && req.method === 'PATCH') {
    const { id } = req.query;
    const isSuspended = Boolean(req.body?.isSuspended);
    const suspensionReason = typeof req.body?.suspensionReason === 'string' ? req.body.suspensionReason.trim() : '';
    const durationDays = Number(req.body?.durationDays);
    const hasDuration = Number.isFinite(durationDays) && durationDays > 0;
    const suspendedUntil = hasDuration ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

    try {
      const userRef = db.collection('users').doc(id as string);
      const existing = await userRef.get();
      if (!existing.exists) return res.status(404).json({ error: 'User not found' });
      await userRef.update({
        isSuspended,
        suspensionReason: isSuspended ? suspensionReason : '',
        suspendedUntil: isSuspended ? suspendedUntil : null,
        lastUpdated: serverTimestamp(),
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update suspension status' });
    }
  }

  // DELETE /api/admin?sub=users&id=xxx — admin: delete a user
  if (sub === 'users' && req.method === 'DELETE') {
    const { id } = req.query;
    try {
      const userRef = db.collection('users').doc(id as string);
      const existing = await userRef.get();
      if (!existing.exists) return res.status(404).json({ error: 'User not found' });

      const scoresSnapshot = await db.collection('scores').where('userId', '==', id).get();
      const batch = db.batch();
      scoresSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      await db.recursiveDelete(userRef);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  return res.status(404).json({ error: 'Route not found' });
}

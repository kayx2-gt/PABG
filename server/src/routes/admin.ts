import { Router } from 'express';
import { db, serverTimestamp } from '../lib/firebase';
import { fetchGamesFromAPI } from '../lib/gamemonetize';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();
const GAMES_COLLECTION = 'games';

// We route everything through a single handler to mirror the Vercel serverless function behavior
// which relies on the ?sub= query parameter for routing.
router.all('/', verifyFirebaseToken, async (req, res) => {
  const { sub } = req.query;

  // GET /admin?sub=gamemonetize
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

  // POST /admin?sub=games — save a game to Firestore
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
      console.log("Saving game to Firestore:", gameData.title);
      const docRef = await db.collection(GAMES_COLLECTION).add({
        ...gameData,
        createdAt: serverTimestamp(),
      });
      console.log("Game saved successfully with ID:", docRef.id);
      return res.json({ id: docRef.id, success: true });
    } catch (error: any) {
      console.error('Error saving game:', error);
      return res.status(500).json({ error: 'Failed to save game: ' + error.message });
    }
  }

  // PUT /admin?sub=games&id=xxx — edit a game
  if (sub === 'games' && req.method === 'PUT') {
    const { id } = req.query;
    try {
      await db.collection(GAMES_COLLECTION).doc(id as string).update(req.body);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update game' });
    }
  }

  // DELETE /admin?sub=games&id=xxx — delete a game
  if (sub === 'games' && req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await db.collection(GAMES_COLLECTION).doc(id as string).delete();
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete game' });
    }
  }

  // PUT /admin?sub=users&id=xxx — admin: update user name
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

  // PATCH /admin?sub=suspension&id=xxx — admin: suspend/unsuspend user
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

  // DELETE /admin?sub=users&id=xxx — admin: delete a user
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
});

export default router;

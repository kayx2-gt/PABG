import { Router } from 'express';
import { db, serverTimestamp } from '../lib/firebase';
import { fetchGamesFromAPI } from '../lib/gamemonetize';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();
const GAMES_COLLECTION = 'games';

// Get games from GameMonetize for admin review
router.get('/gamemonetize', verifyFirebaseToken, async (req, res) => {
  const { category, num, page } = req.query;
  try {
    const games = await fetchGamesFromAPI(
      category as string, 
      Number(num) || 20, 
      Number(page) || 1
    );
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from GameMonetize' });
  }
});

// Add/Save game to Firestore
router.post('/games', verifyFirebaseToken, async (req, res) => {
  const gameData = req.body;
  try {
    // Check for duplicate gameUrl
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
    res.json({ id: docRef.id, success: true });
  } catch (error: any) {
    console.error('Error saving game to Firestore:', error);
    res.status(500).json({ error: 'Failed to save game to database: ' + error.message });
  }
});

// Edit game
router.put('/games/:id', verifyFirebaseToken, async (req, res) => {
  try {
    await db.collection(GAMES_COLLECTION).doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete game
router.delete('/games/:id', verifyFirebaseToken, async (req, res) => {
  try {
    await db.collection(GAMES_COLLECTION).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

export default router;

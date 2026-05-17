import { Router } from 'express';
import { db, serverTimestamp } from '../lib/firebase';
import { verifyFirebaseToken, AuthRequest } from '../middleware/auth';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

// Get user favorites
router.get('/', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const userId = req.user.uid;
  const { email } = req.query; // Optional persistent email for guests
  const userEmailId = (email as string)?.toLowerCase().trim() || req.user.email?.toLowerCase().trim() || null;
  const identifier = userEmailId || userId; // Use email if available, else uid

  try {
    const snapshot = await db.collection('users').doc(identifier).collection('favorites').get();
    const favorites = snapshot.docs.map(doc => doc.data());
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Toggle favorite
router.post('/toggle', verifyFirebaseToken, requireActiveUser, async (req: AuthRequest, res) => {
  const { game, email } = req.body; // Game object and persistent email
  const userId = req.user.uid;
  const identifier = email?.toLowerCase().trim() || userId;

  if (!game || !game.id) {
    return res.status(400).json({ error: 'Missing game data' });
  }

  try {
    const favRef = db.collection('users').doc(identifier).collection('favorites').doc(game.id);
    const doc = await favRef.get();

    if (doc.exists) {
      await favRef.delete();
      res.json({ success: true, isFavorite: false });
    } else {
      await favRef.set({
        ...game,
        favoritedAt: serverTimestamp(),
      });

      // Check favorites10 mission
      const userRef = db.collection('users').doc(identifier);
      const favsSnapshot = await userRef.collection('favorites').get();
      if (favsSnapshot.size >= 10) {
        const userDoc = await userRef.get();
        const missions = userDoc.data()?.missions || {};
        if (missions.favorites10?.status === 'pending') {
          await userRef.update({ 'missions.favorites10.status': 'ready' });
        }
      }

      res.json({ success: true, isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Check if game is favorite
router.get('/check/:gameId', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const { gameId } = req.params;
  const { email } = req.query; // Optional persistent email
  const userId = req.user.uid;
  const identifier = (email as string)?.toLowerCase().trim() || userId;

  try {
    const doc = await db.collection('users').doc(identifier).collection('favorites').doc(gameId).get();
    res.json({ isFavorite: doc.exists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

export default router;

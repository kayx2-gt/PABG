import { Router } from 'express';
import { db, increment, serverTimestamp } from '../lib/firebase';
import { verifyFirebaseToken, AuthRequest } from '../middleware/auth';

const router = Router();
const GAMES_COLLECTION = 'games';

// Get recently played games
router.get('/recent', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const historySnapshot = await db.collection('users').doc(uid).collection('history')
      .orderBy('playedAt', 'desc')
      .limit(10)
      .get();
    
    if (historySnapshot.empty) return res.json([]);

    const historyItems = historySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    
    // Fetch full game details for each history item to ensure metadata is present
    const fullGames = await Promise.all(
      historyItems.map(async (item) => {
        const gameDoc = await db.collection(GAMES_COLLECTION).doc(item.id).get();
        if (gameDoc.exists) {
          return { id: gameDoc.id, ...gameDoc.data(), playedAt: item.playedAt };
        }
        return item; 
      })
    );

    res.json(fullGames);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get all games
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection(GAMES_COLLECTION).orderBy('createdAt', 'desc').get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get featured games (Most Played Games)
router.get('/featured', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection(GAMES_COLLECTION).get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by playCount (descending)
    games.sort((a: any, b: any) => (b.playCount || 0) - (a.playCount || 0));
    
    res.json(games.slice(0, 10)); // return top 10
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured games' });
  }
});

// Get new games (All games ordered by newest)
router.get('/new', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection(GAMES_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch new games' });
  }
});

// Get games by category
router.get('/category/:cat', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection(GAMES_COLLECTION)
      .where('category', '==', req.params.cat)
      .orderBy('createdAt', 'desc')
      .get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games by category' });
  }
});

// Get game by ID
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const doc = await db.collection(GAMES_COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Game not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Increment play count and record history
router.post('/:id/play', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const gameDoc = await db.collection(GAMES_COLLECTION).doc(id).get();
    if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });
    const gameData = gameDoc.data();

    const batch = db.batch();

    // Increment global play count
    const gameRef = db.collection(GAMES_COLLECTION).doc(id);
    batch.set(gameRef, { playCount: increment(1) }, { merge: true });

    // Record in user history
    const historyRef = db.collection('users').doc(uid).collection('history').doc(id);
    batch.set(historyRef, {
      ...gameData,
      id,
      playedAt: serverTimestamp()
    });

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

      // Check Daily Games Missions
      if (dailyGames >= 10 && missions.games10?.status === 'pending') {
        updates['missions.games10.status'] = 'ready';
      }
      if (dailyGames >= 15 && missions.games15?.status === 'pending') {
        updates['missions.games15.status'] = 'ready';
      }
      if (dailyGames >= 20 && missions.games20?.status === 'pending') {
        updates['missions.games20.status'] = 'ready';
      }

      // Check Random Game Mission (if played game matches daily random game)
      if (id === userData.dailyRandomGameId && missions.randomGame5?.status === 'pending') {
        const progress = (missions.randomGame5.progress || 0) + 1;
        updates['missions.randomGame5.progress'] = progress;
        if (progress >= 5) updates['missions.randomGame5.status'] = 'ready';
      }

      // Check Lifetime Games Mission
      if (totalGames >= 100 && missions.totalGames100?.status === 'pending') {
        updates['missions.totalGames100.status'] = 'ready';
      }

      // Check Variety King Mission
      const historySnapshot = await userRef.collection('history').get();
      const uniqueGamesCount = historySnapshot.size;
      updates.totalUniqueGames = uniqueGamesCount;

      if (uniqueGamesCount >= 20 && missions.variety20?.status === 'pending') {
        updates['missions.variety20.status'] = 'ready';
      }

      batch.update(userRef, updates);
    }

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording play:', error);
    res.status(500).json({ error: 'Failed to update play count' });
  }
});

export default router;

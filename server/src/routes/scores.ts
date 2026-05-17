import { Router } from 'express';
import { db, serverTimestamp, increment } from '../lib/firebase';
import { verifyFirebaseToken, AuthRequest } from '../middleware/auth';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

router.post('/submit', verifyFirebaseToken, requireActiveUser, async (req: AuthRequest, res) => {
  const { gameId, score, email } = req.body;
  const userEmailId = email?.toLowerCase().trim();

  if (!gameId || typeof score !== 'number' || score < 0 || !Number.isInteger(score) || !userEmailId) {
    return res.status(400).json({ error: 'Missing gameId, email or invalid score' });
  }

  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const batch = db.batch();

    // Add score record
    const scoreRef = db.collection('scores').doc();
    batch.set(scoreRef, {
      userId: uid,
      gameId,
      score,
      playedAt: serverTimestamp(),
    });

    // Update user stats
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, {
      totalScore: increment(score),
      dailyGamesCount: increment(1),
      totalGamesPlayed: increment(1),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

export default router;

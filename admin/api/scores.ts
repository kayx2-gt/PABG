import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, serverTimestamp, increment } from './_lib/firebase';
import { verifyToken, AuthRequest } from './_lib/auth';
import { requireActiveUser } from './_lib/requireActiveUser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authReq = req as AuthRequest;
  if (!(await verifyToken(authReq, res))) return;
  if (!(await requireActiveUser(authReq, res))) return;

  const { gameId, score, email } = req.body;
  const userEmailId = email?.toLowerCase().trim();

  if (!gameId || typeof score !== 'number' || score < 0 || !Number.isInteger(score) || !userEmailId) {
    return res.status(400).json({ error: 'Missing gameId, email or invalid score' });
  }

  const uid = authReq.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const batch = db.batch();

    const scoreRef = db.collection('scores').doc();
    batch.set(scoreRef, {
      userId: uid,
      gameId,
      score,
      playedAt: serverTimestamp(),
    });

    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, {
      totalScore: increment(score),
      dailyGamesCount: increment(1),
      totalGamesPlayed: increment(1),
    });

    await batch.commit();
    return res.json({ success: true });
  } catch (error) {
    console.error('Error submitting score:', error);
    return res.status(500).json({ error: 'Failed to submit score' });
  }
}

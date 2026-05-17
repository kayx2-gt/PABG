import { Router } from 'express';
import { db, serverTimestamp, increment } from '../lib/firebase';
import { verifyFirebaseToken, AuthRequest } from '../middleware/auth';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

router.post('/upsert', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const { name, email, photoURL } = req.body;
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data() || {};
      if (data.isSuspended) {
        const suspendedUntil = data.suspendedUntil ? data.suspendedUntil.toDate() : null;
        if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
          // Temporary suspension expired, lift it
          await userRef.update({
            isSuspended: false,
            suspensionReason: '',
            suspendedUntil: null
          });
        } else {
          const expiryMessage = suspendedUntil ? ` until ${suspendedUntil.toLocaleString()}` : ' permanently';
          return res.status(403).json({
            error: `Your account has been suspended${expiryMessage}. Reason: ${data.suspensionReason || 'No reason specified'}.`,
            isSuspended: true,
            suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null
          });
        }
      }
    }

    let updates: any = {
      name,
      email: email?.toLowerCase().trim() || req.user?.email || '',
      photoURL: photoURL || req.user?.picture || '',
      lastUpdated: serverTimestamp(),
    };

    if (doc.exists) {
      const data = doc.data() || {};
      const lastLogin = data.lastLoginDate || '';
      const missions = data.missions || {};

      // Initialize missions if missing or it's a new day
      if (!data.missions || lastLogin !== today) {
        updates.lastLoginDate = today;
        updates.dailyGamesCount = 0; // Reset daily games count
        
        // Login Streak
        if (lastLogin === yesterday) {
          updates.loginStreak = (data.loginStreak || 0) + 1;
          if (updates.loginStreak >= 7 && missions.streak7?.status === 'pending') {
            updates['missions.streak7.status'] = 'ready';
          }
        } else if (lastLogin !== today) {
          updates.loginStreak = 1;
        }

        // Pick a Random Game of the Day
        const gamesSnapshot = await db.collection('games').limit(20).get();
        if (!gamesSnapshot.empty) {
          const gameIndex = Math.floor(Math.random() * gamesSnapshot.size);
          updates.dailyRandomGameId = gamesSnapshot.docs[gameIndex].id;
          updates.dailyRandomGameTitle = gamesSnapshot.docs[gameIndex].data().title;
        }

        // Initialize Daily Missions
        const dailyMissions = ['dailyLogin', 'randomGame5', 'games10', 'games15', 'games20'];
        const newMissions = { ...missions };

        dailyMissions.forEach(mId => {
          newMissions[mId] = { status: mId === 'dailyLogin' ? 'ready' : 'pending' };
          if (mId === 'randomGame5') newMissions[mId].progress = 0;
        });

        // Add New Achievements if missing
        const lifetimeMissions = ['variety20', 'hours10', 'streak7', 'favorites10', 'totalGames100', 'member30'];
        lifetimeMissions.forEach(mId => {
          if (!newMissions[mId]) newMissions[mId] = { status: 'pending' };
        });

        updates.missions = newMissions;
      }
    } else {
      // First Time User
      const gamesSnapshot = await db.collection('games').limit(20).get();
      let randomGameId = '';
      let randomGameTitle = '';
      if (!gamesSnapshot.empty) {
        const gameIndex = Math.floor(Math.random() * gamesSnapshot.size);
        randomGameId = gamesSnapshot.docs[gameIndex].id;
        randomGameTitle = gamesSnapshot.docs[gameIndex].data().title;
      }

      updates.lastLoginDate = today;
      updates.loginStreak = 1;
      updates.dailyGamesCount = 0;
      updates.totalGamesPlayed = 0;
      updates.totalPoints = 0;
      updates.totalMissionsCompleted = 0;
      updates.dailyRandomGameId = randomGameId;
      updates.dailyRandomGameTitle = randomGameTitle;
      updates.createdAt = serverTimestamp();
      updates.missions = {
        dailyLogin: { status: 'ready' },
        randomGame5: { status: 'pending', progress: 0 },
        games10: { status: 'pending' },
        games15: { status: 'pending' },
        games20: { status: 'pending' },
        hours10: { status: 'pending' },
        variety20: { status: 'pending' },
        streak7: { status: 'pending' },
        favorites10: { status: 'pending' },
        totalGames100: { status: 'pending' },
        member30: { status: 'pending' }
      };
    }
    
    await userRef.set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in upsert:', error);
    res.status(500).json({ error: 'Failed to upsert user' });
  }
});

router.get('/me', verifyFirebaseToken, async (req: AuthRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    
    const data = doc.data()!;
    if (data.isSuspended) {
      const suspendedUntil = data.suspendedUntil ? data.suspendedUntil.toDate() : null;
      if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
        // Temporary suspension expired, lift it
        await db.collection('users').doc(uid).update({
          isSuspended: false,
          suspensionReason: '',
          suspendedUntil: null
        });
        data.isSuspended = false;
        data.suspensionReason = '';
        data.suspendedUntil = null;
      } else {
        const expiryMessage = suspendedUntil ? ` until ${suspendedUntil.toLocaleString()}` : ' permanently';
        return res.status(403).json({
          error: `Your account has been suspended${expiryMessage}. Reason: ${data.suspensionReason || 'No reason specified'}.`,
          isSuspended: true,
          suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null
        });
      }
    }

    res.json({ id: doc.id, ...data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/claim-mission', verifyFirebaseToken, requireActiveUser, async (req: AuthRequest, res) => {
  const { missionId } = req.body;
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const data = doc.data()!;
    const missions = data.missions || {};
    const mission = missions[missionId];

    if (!mission || mission.status !== 'ready') {
      return res.status(400).json({ error: 'Mission not ready to be claimed' });
    }

    // Points mapping
    const pointsMap: Record<string, number> = {
      dailyLogin: 1,
      randomGame5: 3,
      games10: 5,
      games15: 7,
      games20: 10,
      variety20: 15,
      hours10: 20,
      streak7: 25,
      favorites10: 10,
      totalGames100: 30,
      member30: 50
    };

    const points = pointsMap[missionId] || 0;

    await userRef.update({
      [`missions.${missionId}.status`]: 'claimed',
      totalPoints: increment(points),
      totalMissionsCompleted: increment(1)
    });

    res.json({ success: true, points });
  } catch (error) {
    console.error('Error claiming mission:', error);
    res.status(500).json({ error: 'Failed to claim mission' });
  }
});

router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── Admin Routes ───────────────────────────────────────────────────

router.put('/:id', verifyFirebaseToken, async (req, res) => {
  const userId = req.params.id;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const existing = await userRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({
      name: name.trim(),
      lastUpdated: serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.patch('/:id/suspension', verifyFirebaseToken, async (req, res) => {
  const userId = req.params.id;
  const isSuspended = Boolean(req.body?.isSuspended);
  const suspensionReason = typeof req.body?.suspensionReason === 'string' ? req.body.suspensionReason.trim() : '';
  const durationDays = Number(req.body?.durationDays);
  const hasDuration = Number.isFinite(durationDays) && durationDays > 0;
  const suspendedUntil = hasDuration ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

  try {
    const userRef = db.collection('users').doc(userId);
    const existing = await userRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({
      isSuspended,
      suspensionReason: isSuspended ? suspensionReason : '',
      suspendedUntil: isSuspended ? suspendedUntil : null,
      lastUpdated: serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating suspension:', error);
    res.status(500).json({ error: 'Failed to update suspension status' });
  }
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const userRef = db.collection('users').doc(userId);
    const existing = await userRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const scoresSnapshot = await db.collection('scores').where('userId', '==', userId).get();
    const batch = db.batch();

    scoresSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    await db.recursiveDelete(userRef);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

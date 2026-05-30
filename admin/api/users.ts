import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, serverTimestamp, increment } from './_lib/firebase';
import { verifyToken, AuthRequest, ALLOWED_ADMIN_EMAILS, isAdmin } from './_lib/auth';
import { requireActiveUser } from './_lib/requireActiveUser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authReq = req as AuthRequest;
  if (!(await verifyToken(authReq, res))) return;

  const { sub } = req.query; // used for sub-routes like 'upsert', 'me', 'claim-mission'

  // POST /api/users?sub=upsert
  if (sub === 'upsert' && req.method === 'POST') {
    const { name, email, photoURL } = req.body;
    const uid = authReq.user?.uid;
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
            await userRef.update({ isSuspended: false, suspensionReason: '', suspendedUntil: null });
          } else {
            const expiryMessage = suspendedUntil ? ` until ${suspendedUntil.toLocaleString()}` : ' permanently';
            return res.status(403).json({
              error: `Your account has been suspended${expiryMessage}. Reason: ${data.suspensionReason || 'No reason specified'}.`,
              isSuspended: true,
              suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null,
            });
          }
        }
      }

      let updates: any = {
        name,
        email: email?.toLowerCase().trim() || authReq.user?.email || '',
        photoURL: photoURL || authReq.user?.picture || '',
        lastUpdated: serverTimestamp(),
      };

      if (doc.exists) {
        const data = doc.data() || {};
        const lastLogin = data.lastLoginDate || '';
        const missions = data.missions || {};

        if (!data.missions || lastLogin !== today) {
          updates.lastLoginDate = today;
          updates.dailyGamesCount = 0;

          if (lastLogin === yesterday) {
            updates.loginStreak = (data.loginStreak || 0) + 1;
            if (updates.loginStreak >= 7 && missions.streak7?.status === 'pending') {
              updates['missions.streak7.status'] = 'ready';
            }
          } else if (lastLogin !== today) {
            updates.loginStreak = 1;
          }

          const gamesSnapshot = await db.collection('games').limit(20).get();
          if (!gamesSnapshot.empty) {
            const gameIndex = Math.floor(Math.random() * gamesSnapshot.size);
            updates.dailyRandomGameId = gamesSnapshot.docs[gameIndex].id;
            updates.dailyRandomGameTitle = gamesSnapshot.docs[gameIndex].data().title;
          }

          const dailyMissions = ['dailyLogin', 'randomGame5', 'games10', 'games15', 'games20'];
          const newMissions = { ...missions };
          dailyMissions.forEach(mId => {
            newMissions[mId] = { status: mId === 'dailyLogin' ? 'ready' : 'pending' };
            if (mId === 'randomGame5') newMissions[mId].progress = 0;
          });

          const lifetimeMissions = ['variety20', 'hours10', 'streak7', 'favorites10', 'totalGames100', 'member30'];
          lifetimeMissions.forEach(mId => {
            if (!newMissions[mId]) newMissions[mId] = { status: 'pending' };
          });

          updates.missions = newMissions;
        }
      } else {
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
          member30: { status: 'pending' },
        };
      }

      await userRef.set(updates, { merge: true });
      return res.json({ success: true });
    } catch (error) {
      console.error('Error in upsert:', error);
      return res.status(500).json({ error: 'Failed to upsert user' });
    }
  }

  // GET /api/users?sub=me
  if (sub === 'me' && req.method === 'GET') {
    const uid = authReq.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return res.status(404).json({ error: 'User not found' });
      const data = doc.data()!;
      if (data.isSuspended) {
        const suspendedUntil = data.suspendedUntil ? data.suspendedUntil.toDate() : null;
        if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
          await db.collection('users').doc(uid).update({ isSuspended: false, suspensionReason: '', suspendedUntil: null });
        } else {
          const expiryMessage = suspendedUntil ? ` until ${suspendedUntil.toLocaleString()}` : ' permanently';
          return res.status(403).json({
            error: `Your account has been suspended${expiryMessage}. Reason: ${data.suspensionReason || 'No reason specified'}.`,
            isSuspended: true,
            suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null,
          });
        }
      }
      const role = (data.email && ALLOWED_ADMIN_EMAILS.includes(data.email)) ? 'admin' : 'user';
      return res.json({ id: doc.id, ...data, role });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // POST /api/users?sub=claim-mission
  if (sub === 'claim-mission' && req.method === 'POST') {
    const { missionId } = req.body;
    const uid = authReq.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await requireActiveUser(authReq, res))) return;

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
      const pointsMap: Record<string, number> = {
        dailyLogin: 1, randomGame5: 3, games10: 5, games15: 7, games20: 10,
        variety20: 15, hours10: 20, streak7: 25, favorites10: 10, totalGames100: 30, member30: 50,
      };
      const points = pointsMap[missionId] || 0;
      await userRef.update({
        [`missions.${missionId}.status`]: 'claimed',
        totalPoints: increment(points),
        totalMissionsCompleted: increment(1),
      });
      return res.json({ success: true, points });
    } catch (error) {
      console.error('Error claiming mission:', error);
      return res.status(500).json({ error: 'Failed to claim mission' });
    }
  }

  // GET /api/users (all users — admin)
  if (!sub && req.method === 'GET') {
    if (!isAdmin(authReq, res)) return;
    try {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  return res.status(404).json({ error: 'Route not found' });
}

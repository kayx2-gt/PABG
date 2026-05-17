import type { VercelResponse } from '@vercel/node';
import { db } from './firebase';
import type { AuthRequest } from './auth';

/**
 * Checks if the authenticated user is active (not suspended).
 * Returns false and sends 403 if suspended — caller should return immediately.
 */
export async function requireActiveUser(req: AuthRequest, res: VercelResponse): Promise<boolean> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return true; // New user, allow through

    const userData = userDoc.data();
    if (userData?.isSuspended) {
      const suspendedUntil = userData.suspendedUntil ? userData.suspendedUntil.toDate() : null;

      // If temporary suspension expired, lift it automatically
      if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
        await db.collection('users').doc(uid).update({
          isSuspended: false,
          suspensionReason: '',
          suspendedUntil: null,
        });
        return true;
      }

      const expiryMessage = suspendedUntil
        ? ` until ${suspendedUntil.toLocaleString()}`
        : ' permanently';

      res.status(403).json({
        error: `Your account has been suspended${expiryMessage}. Reason: ${userData.suspensionReason || 'No reason specified'}.`,
        isSuspended: true,
        suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('requireActiveUser error:', error);
    res.status(500).json({ error: 'Failed to verify active user status' });
    return false;
  }
}

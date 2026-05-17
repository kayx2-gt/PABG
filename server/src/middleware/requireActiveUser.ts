import { Response, NextFunction } from 'express';
import { db } from '../lib/firebase';
import { AuthRequest } from './auth';

export const requireActiveUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return next();

    const userData = userDoc.data();
    if (userData?.isSuspended) {
      const suspendedUntil = userData.suspendedUntil ? userData.suspendedUntil.toDate() : null;
      
      // If temporary suspension has expired, automatically lift it
      if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
        await db.collection('users').doc(uid).update({
          isSuspended: false,
          suspensionReason: '',
          suspendedUntil: null
        });
        return next();
      }

      const expiryMessage = suspendedUntil 
        ? ` until ${suspendedUntil.toLocaleString()}` 
        : ' permanently';
        
      return res.status(403).json({ 
        error: `Your account has been suspended${expiryMessage}. Reason: ${userData.suspensionReason || 'No reason specified'}.`,
        isSuspended: true,
        suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null
      });
    }

    next();
  } catch (error) {
    console.error('requireActiveUser middleware error:', error);
    res.status(500).json({ error: 'Failed to verify active user status' });
  }
};

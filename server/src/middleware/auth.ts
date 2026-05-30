import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyFirebaseToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const ALLOWED_ADMIN_EMAILS = [
  'appdevbsit@gmail.com',
  'kylematthewnnicor@gmail.com',
  'soniomark412@gmail.com',
  'anthonyojano50@gmail.com',
  'jeaniouray21@gmail.com',
  'dalidalysah@gmail.com',
  'santiagojuzin05@gmail.com',
  'Chansalivio17@gmail.com',
  'genermenez@gmail.com',
];

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.email) {
    return res.status(403).json({ error: 'Forbidden: No email in token' });
  }

  if (!ALLOWED_ADMIN_EMAILS.includes(req.user.email)) {
    console.warn(`Unauthorized admin access attempt by ${req.user.email}`);
    return res.status(403).json({ error: 'Forbidden: You do not have admin privileges' });
  }

  next();
};

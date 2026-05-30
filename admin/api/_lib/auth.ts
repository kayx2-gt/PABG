import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auth } from './firebase';

export interface AuthRequest extends VercelRequest {
  user?: any;
}

/**
 * Verifies the Firebase Bearer token in the Authorization header.
 * Attaches decoded user to req.user.
 * Returns false and sends 401 if invalid — caller should return immediately.
 */
export async function verifyToken(req: AuthRequest, res: VercelResponse): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return false;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return false;
  }
}

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

/**
 * Checks if the authenticated user's email is in the allowed admin list.
 * Returns false and sends 403 if not authorized.
 */
export function isAdmin(req: AuthRequest, res: VercelResponse): boolean {
  if (!req.user || !req.user.email) {
    res.status(403).json({ error: 'Forbidden: No email in token' });
    return false;
  }

  if (!ALLOWED_ADMIN_EMAILS.includes(req.user.email)) {
    console.warn(`Unauthorized admin access attempt by ${req.user.email}`);
    res.status(403).json({ error: 'Forbidden: You do not have admin privileges' });
    return false;
  }

  return true;
}

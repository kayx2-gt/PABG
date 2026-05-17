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

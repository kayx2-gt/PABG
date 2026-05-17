import { auth } from './firebase';
import { Game } from '../types/game';

// Set EXPO_PUBLIC_SERVER_URL in .env to your Vercel URL after deployment
// e.g. EXPO_PUBLIC_SERVER_URL=https://your-app.vercel.app/api
const BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://192.168.254.167:3000').replace(/\/$/, '');

// Detects if we're pointing to Vercel (uses /api/ paths + ?sub= routing)
// or the local Express server (uses classic Express paths)
const isVercel = BASE_URL.includes('vercel.app') || BASE_URL.includes('/api');

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── Games ─────────────────────────────────────────────────────────────────────

export const fetchGames = async () => {
  const headers = await getAuthHeaders();
  const url = isVercel ? `${BASE_URL}/games` : `${BASE_URL}/games`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const fetchFeaturedGames = async () => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/games?sub=featured`
    : `${BASE_URL}/games/featured`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const fetchNewGames = async () => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/games?sub=new`
    : `${BASE_URL}/games/new`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const fetchGamesByCategory = async (category: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/games?sub=category&cat=${encodeURIComponent(category)}`
    : `${BASE_URL}/games/category/${encodeURIComponent(category)}`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const fetchRecentGames = async (email?: string) => {
  const headers = await getAuthHeaders();
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
  const url = isVercel
    ? `${BASE_URL}/games?sub=recent${emailParam}`
    : `${BASE_URL}/games/recent${email ? `?email=${encodeURIComponent(email)}` : ''}`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const recordGamePlay = async (gameId: string, email?: string) => {
  const headers = await getAuthHeaders();
  try {
    // Both Vercel and Express use POST /games/:id or /api/games/:id for play
    const url = isVercel
      ? `${BASE_URL}/games/${gameId}`
      : `${BASE_URL}/games/${gameId}/play`;
    const response = await fetch(url, { method: 'POST', headers });
    return await response.json();
  } catch (error) {
    console.error('Failed to record game play:', error);
  }
};

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const fetchLeaderboard = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/leaderboard`, { headers });
  return response.json();
};

// ── Scores ────────────────────────────────────────────────────────────────────

export const submitScore = async (gameId: string, score: number, email: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/scores`
    : `${BASE_URL}/scores/submit`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ gameId, score, email }),
  });
  return response.json();
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const fetchUserProfile = async () => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/users?sub=me`
    : `${BASE_URL}/users/me`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || 'Failed to fetch profile');
    (error as any).status = response.status;
    throw error;
  }
  return data;
};

export const upsertUser = async (name: string, email: string, photoURL?: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/users?sub=upsert`
    : `${BASE_URL}/users/upsert`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, email, photoURL }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || 'Failed to upsert user');
    (error as any).status = response.status;
    throw error;
  }
  return data;
};

export const claimMission = async (missionId: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/users?sub=claim-mission`
    : `${BASE_URL}/users/claim-mission`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ missionId }),
  });
  if (!response.ok) throw new Error('Failed to claim mission');
  return response.json();
};

// ── Favorites ─────────────────────────────────────────────────────────────────

export const fetchFavorites = async (email?: string) => {
  const headers = await getAuthHeaders();
  const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
  const url = isVercel
    ? `${BASE_URL}/favorites${emailParam}`
    : `${BASE_URL}/favorites${emailParam}`;
  const response = await fetch(url, { headers });
  return response.json();
};

export const toggleFavorite = async (game: Game, email: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/favorites?sub=toggle`
    : `${BASE_URL}/favorites/toggle`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ game, email }),
  });
  return response.json();
};

export const checkFavorite = async (gameId: string, email: string) => {
  const headers = await getAuthHeaders();
  const url = isVercel
    ? `${BASE_URL}/favorites?sub=check&gameId=${gameId}&email=${encodeURIComponent(email)}`
    : `${BASE_URL}/favorites/check/${gameId}?email=${encodeURIComponent(email)}`;
  const response = await fetch(url, { headers });
  return response.json();
};

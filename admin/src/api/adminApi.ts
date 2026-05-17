import { auth } from './firebase';

// In production (Vercel), admin and API are same origin — no BASE_URL needed.
// In local dev, the server still runs on :3000, so we keep it configurable.
const BASE_URL = import.meta.env.VITE_SERVER_URL || '';

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

export const fetchManagedGames = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/games`, { headers });
  return response.json();
};

export const fetchExternalGames = async (category = '0', num = 20, page = 1) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${BASE_URL}/api/admin?sub=gamemonetize&category=${category}&num=${num}&page=${page}`,
    { headers }
  );
  return response.json();
};

export const saveGame = async (gameData: any) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=games`, {
    method: 'POST',
    headers,
    body: JSON.stringify(gameData),
  });
  return response.json();
};

export const updateGame = async (gameId: string, updatedData: any) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=games&id=${gameId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatedData),
  });
  return response.json();
};

export const deleteGame = async (gameId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=games&id=${gameId}`, {
    method: 'DELETE',
    headers,
  });
  return response.json();
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const fetchUsers = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/users`, { headers });
  return response.json();
};

export const updateUser = async (userId: string, userData: any) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=users&id=${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const updateUserSuspension = async (
  userId: string,
  isSuspended: boolean,
  suspensionReason = '',
  durationDays?: number | null
) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=suspension&id=${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ isSuspended, suspensionReason, durationDays }),
  });
  return response.json();
};

export const deleteUser = async (userId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/admin?sub=users&id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers,
  });
  return response.json();
};

// ── Stats / Leaderboard ───────────────────────────────────────────────────────

export const fetchStats = async () => {
  const [games, users] = await Promise.all([fetchManagedGames(), fetchUsers()]);
  return {
    totalGames: Array.isArray(games) ? games.length : 0,
    totalUsers: Array.isArray(users) ? users.length : 0,
    highScore:
      Array.isArray(users) && users.length > 0
        ? users[0].totalPoints || users[0].totalScore || 0
        : 0,
  };
};

export const fetchLeaderboard = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/leaderboard`, { headers });
  return response.json();
};

export const fetchTopGames = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/games?sub=featured`, { headers });
  return response.json();
};
const STORAGE_KEY = 'admin_recent_actions';
const MAX_ACTIONS = 100;

export interface AdminAction {
  id: string;
  type: 'add' | 'delete' | 'edit';
  gameTitle: string;
  timestamp: number;
}

/**
 * Adds a new admin action to localStorage, keeping only the last MAX_ACTIONS entries.
 */
export const addAction = (type: AdminAction['type'], gameTitle: string): void => {
  const existing = getActions();
  const newAction: AdminAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    gameTitle,
    timestamp: Date.now(),
  };
  const updated = [newAction, ...existing].slice(0, MAX_ACTIONS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch storage event so other components can react
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('actionLogger: failed to write to localStorage', e);
  }
};

/**
 * Returns the list of recent admin actions from localStorage.
 */
export const getActions = (): AdminAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminAction[];
  } catch {
    return [];
  }
};

/**
 * Clears all stored admin actions.
 */
export const clearActions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

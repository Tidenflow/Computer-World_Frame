const STORAGE_KEY = 'computer-world-unlocked-nodes';

export const loadUnlockedNodes = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error('Failed to load unlocked nodes:', error);
  }
  // Default: only fundamentals is unlocked
  return new Set(['fundamentals']);
};

export const saveUnlockedNodes = (unlockedNodes: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unlockedNodes)));
  } catch (error) {
    console.error('Failed to save unlocked nodes:', error);
  }
};

export const unlockNode = (nodeId: string): void => {
  const unlocked = loadUnlockedNodes();
  unlocked.add(nodeId);
  saveUnlockedNodes(unlocked);
};

export const resetProgress = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

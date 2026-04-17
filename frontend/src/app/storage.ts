import { localStorageProgressRepository } from './repositories/local-storage-progress.repository';

const STORAGE_KEY = 'computer-world-unlocked-nodes';

export const loadUnlockedNodes = (): Set<string> => {
  if (!localStorageProgressRepository) {
    return new Set(['fundamentals']);
  }

  return localStorageProgressRepository.loadUnlockedNodes();
};

export const saveUnlockedNodes = (unlockedNodes: Set<string>): void => {
  localStorageProgressRepository?.saveUnlockedNodes(unlockedNodes);
};

export const unlockNode = (nodeId: string): void => {
  const unlocked = loadUnlockedNodes();
  unlocked.add(nodeId);
  saveUnlockedNodes(unlocked);
};

export const resetProgress = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

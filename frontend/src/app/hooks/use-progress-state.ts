import { useEffect, useState } from 'react'

import type { ProgressRepository } from '../contracts/progress'

export function useProgressState(repository: ProgressRepository | null) {
  const [unlockedNodes, setUnlockedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!repository) {
      setUnlockedNodes(new Set(['fundamentals']))
      return
    }

    setUnlockedNodes(repository.loadUnlockedNodes())
  }, [repository])

  const saveUnlockedNodeSet = (nextUnlockedNodes: Set<string>) => {
    setUnlockedNodes(nextUnlockedNodes)
    repository?.saveUnlockedNodes(nextUnlockedNodes)
  }

  return {
    unlockedNodes,
    saveUnlockedNodeSet,
  }
}

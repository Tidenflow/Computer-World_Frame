export interface ProgressRepository {
  loadUnlockedNodes(): Set<string>
  saveUnlockedNodes(nodes: Set<string>): void
}

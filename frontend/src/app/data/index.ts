import aiMapJson from './ai.json'
import networkMapJson from './network.json'
import programmingMapJson from './programming.json'
import programmingLanguagesMapJson from './programmingLanguages.json'
import rootMapJson from './root.json'
import softwareMapJson from './software.json'
import type { GraphData, NodeDefinition } from '../types'

function toGraphData(map: unknown): GraphData<NodeDefinition> {
  return map as GraphData<NodeDefinition>
}

export const defaultMap = toGraphData(rootMapJson)
export const softwareMap = toGraphData(softwareMapJson)
export const programmingMap = toGraphData(programmingMapJson)
export const programmingLanguagesMap = toGraphData(programmingLanguagesMapJson)
export const aiMap = toGraphData(aiMapJson)
export const networkMap = toGraphData(networkMapJson)

export const allMaps: Record<string, GraphData<NodeDefinition>> = {
  root: defaultMap,
  software: softwareMap,
  programming: programmingMap,
  'programming-languages': programmingLanguagesMap,
  ai: aiMap,
  network: networkMap,
}

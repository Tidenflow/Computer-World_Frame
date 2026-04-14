import { describe, it, expect } from 'vitest';
import { matchNodeByTerm, extractTerms } from './matching';
import type { MapNodeDocument } from '@shared/contract';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockNodes: MapNodeDocument[] = [
  {
    id: 'http',
    title: 'HTTP',
    domain: 'network',
    stage: 3,
    deps: ['tcp-ip'],
    aliases: ['HyperText Transfer Protocol']
  },
  {
    id: 'web-api',
    title: 'Web API',
    domain: 'network',
    stage: 4,
    deps: ['http', 'rest'],
    aliases: ['API', 'api']
  },
  {
    id: 'rest',
    title: 'REST API',
    domain: 'network',
    stage: 4,
    deps: ['http'],
    aliases: ['REST']
  },
  {
    id: 'third-party-api',
    title: 'ThirdParty API',
    domain: 'network',
    stage: 4,
    deps: ['web-api'],
    aliases: []
  },
  {
    id: 'api-gateway',
    title: 'API Gateway',
    domain: 'network',
    stage: 5,
    deps: ['web-api'],
    aliases: []
  },
  {
    id: 'docker',
    title: 'Docker',
    domain: 'programming',
    stage: 4,
    deps: ['linux', 'container'],
    aliases: ['docker', 'Docker']
  },
  {
    id: 'container',
    title: 'Container',
    domain: 'programming',
    stage: 3,
    deps: ['linux'],
    aliases: ['容器']
  },
  {
    id: 'operating-system',
    title: 'Operating System',
    domain: 'os',
    stage: 2,
    deps: [],
    aliases: ['OS', 'os', '操作系统']
  },
  {
    id: 'cpu',
    title: 'CPU',
    domain: 'hardware',
    stage: 1,
    deps: [],
    aliases: ['中央处理器']
  }
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function expectMatchType(result: ReturnType<typeof matchNodeByTerm>, type: string) {
  return expect(result.candidates.some(c => c.matchType === type));
}

function expectScoresDesc(result: ReturnType<typeof matchNodeByTerm>) {
  for (let i = 1; i < result.candidates.length; i++) {
    expect(result.candidates[i - 1].score).toBeGreaterThanOrEqual(result.candidates[i].score);
  }
}

// ---------------------------------------------------------------------------
// Tests — 精确匹配
// ---------------------------------------------------------------------------

describe('精确匹配 (exact)', () => {
  it('title 完全相等时应命中 score=1.0', () => {
    const result = matchNodeByTerm('HTTP', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].node?.title).toBe('HTTP');
    expect(result.candidates[0].matchType).toBe('exact');
    expect(result.candidates[0].score).toBe(1.0);
    expect(result.autoSelect).toBe(true);
  });

  it('大小写不敏感', () => {
    const result = matchNodeByTerm('http', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('exact');
    expect(result.autoSelect).toBe(true);
  });

  it('自动选中：单候选时 autoSelect=true', () => {
    const result = matchNodeByTerm('HTTP', mockNodes);
    expect(result.autoSelect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — 别名匹配
// ---------------------------------------------------------------------------

describe('别名匹配 (alias)', () => {
  it('aliases 中存在完全相等的别名时应命中 score=0.9', () => {
    const result = matchNodeByTerm('OS', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].node?.title).toBe('Operating System');
    expect(result.candidates[0].matchType).toBe('alias');
    expect(result.candidates[0].score).toBe(0.9);
    expect(result.autoSelect).toBe(true);
  });

  it('别名大小写不敏感', () => {
    const result = matchNodeByTerm('os', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('alias');
    expect(result.autoSelect).toBe(true);
  });

  it('中文别名匹配', () => {
    const result = matchNodeByTerm('操作系统', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('alias');
    expect(result.candidates[0].node?.id).toBe('operating-system');
    expect(result.autoSelect).toBe(true);
  });

  it('Docker 大小写匹配：先精确匹配 title', () => {
    // "docker" 先命中 title "Docker"（exact），优先级高于 alias
    const result = matchNodeByTerm('docker', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('exact');
    expect(result.autoSelect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — 部分匹配
// ---------------------------------------------------------------------------

describe('部分匹配 (partial)', () => {
  it('节点 title 包含输入词时应命中', () => {
    const result = matchNodeByTerm('API', mockNodes);
    // API Gateway, Web API, REST API, ThirdParty API 四个都包含 "API"
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.autoSelect).toBe(false); // 多候选，不自动选中
  });

  it('输入词包含节点 title 时应命中', () => {
    const result = matchNodeByTerm('CPU啊啊', mockNodes);
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some(c => c.node?.id === 'cpu')).toBe(true);
  });

  it('多候选场景下 autoSelect=false', () => {
    const result = matchNodeByTerm('API', mockNodes);
    expect(result.autoSelect).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — 多候选场景
// ---------------------------------------------------------------------------

describe('多候选场景', () => {
  it('"api" 应匹配至少 4 个节点', () => {
    const result = matchNodeByTerm('api', mockNodes);
    expect(result.candidates.length).toBeGreaterThanOrEqual(4);
    expect(result.autoSelect).toBe(false);
  });

  it('结果按 score 降序排列', () => {
    const result = matchNodeByTerm('api', mockNodes);
    expectScoresDesc(result);
  });

  it('最多返回 5 个候选', () => {
    // 将所有节点 title 都变成包含 "e"，制造大量候选
    const manyNodes: MapNodeDocument[] = Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      title: `Node${i}Eterm`,  // 都包含 "e"
      domain: 'programming',
      stage: 1,
      deps: []
    }));
    const result = matchNodeByTerm('e', manyNodes);
    expect(result.candidates.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Tests — 动态兜底（模糊匹配）
// ---------------------------------------------------------------------------

describe('动态兜底（fuzzy — 无写死词典）', () => {
  it('输入 "dockr"（拼错）应通过编辑距离容错匹配 Docker', () => {
    const result = matchNodeByTerm('dockr', mockNodes);
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates[0].node?.id).toBe('docker');
    expect(result.candidates[0].matchType).toBe('fuzzy');
    // 仅 1 个兜底候选时 autoSelect=true（符合设计）
    expect(result.autoSelect).toBe(true);
  });

  it('输入 "containe"（拼错半个）应通过部分前缀匹配 Container', () => {
    // "containe".slice(0, 4) = "cont" 被 "container" 包含，走部分匹配而非 fuzzy
    const result = matchNodeByTerm('containe', mockNodes);
    expect(result.candidates.some(c => c.node?.id === 'container')).toBe(true);
    expect(result.candidates[0].matchType).toBe('partial');
  });

  it('输入 "hypertext" 应通过子串包含兜底匹配 HTTP', () => {
    const result = matchNodeByTerm('hypertext', mockNodes);
    expect(result.candidates.some(c => c.node?.id === 'http')).toBe(true);
  });

  it('输入地图中完全不存在的词应返回友好提示候选', () => {
    const result = matchNodeByTerm('量子计算', mockNodes);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].node).toBeNull();
    expect(result.candidates[0].matchType).toBe('non-tech');
    expect(result.autoSelect).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — 意图黑名单（非技术话题）
// ---------------------------------------------------------------------------

describe('意图黑名单（非技术话题）', () => {
  // 故意把 "hi" 移出去单独测，因为它可能被 HyperText 的 hi 匹配到
  const nonTechInputs = [
    '今天天气怎么样',
    '你好',
    'hello',
    '谢谢你的帮助',
    '再见',
    '你是谁',
    '今天几点了',
    '今天星期几',
    '吃早饭了吗',
    '睡觉',
    '起床了'
  ];

  nonTechInputs.forEach(input => {
    it(`"${input}" 应被识别为非技术话题`, () => {
      const result = matchNodeByTerm(input, mockNodes);
      expect(result.candidates[0].matchType).toBe('non-tech');
      expect(result.candidates[0].node).toBeNull();
      expect(result.autoSelect).toBe(false);
    });
  });
  // 单独测 "hi"（因为它可能被 HyperText 的 "hi" 匹配到）
  it('"hi" 在黑名单中时应优先识别为非技术话题', () => {
    const result = matchNodeByTerm('hi', mockNodes);
    expect(result.candidates[0].matchType).toBe('non-tech');
    expect(result.candidates[0].node).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — 上下文提示
// ---------------------------------------------------------------------------

describe('上下文提示 (contextHints)', () => {
  it('应包含 domain 中文名称', () => {
    const result = matchNodeByTerm('HTTP', mockNodes);
    const hints = result.candidates[0].contextHints;
    expect(hints.some(h => h.includes('网络层'))).toBe(true);
  });

  it('应包含 stage 信息', () => {
    const result = matchNodeByTerm('HTTP', mockNodes);
    const hints = result.candidates[0].contextHints;
    expect(hints.some(h => h.includes('Stage 3'))).toBe(true);
  });

  it('有前置依赖时应展示 deps', () => {
    const result = matchNodeByTerm('HTTP', mockNodes);
    const hints = result.candidates[0].contextHints;
    expect(hints.some(h => h.includes('tcp-ip'))).toBe(true);
  });

  it('无前置依赖时不应出现 "前置依赖"', () => {
    const result = matchNodeByTerm('CPU', mockNodes);
    const hints = result.candidates[0].contextHints;
    expect(hints.some(h => h.includes('前置依赖'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — 边界情况
// ---------------------------------------------------------------------------

describe('边界情况', () => {
  it('空字符串输入返回空结果', () => {
    const result = matchNodeByTerm('', mockNodes);
    expect(result.candidates).toHaveLength(0);
    expect(result.autoSelect).toBe(false);
  });

  it('纯空格输入返回空结果', () => {
    const result = matchNodeByTerm('   ', mockNodes);
    expect(result.candidates).toHaveLength(0);
    expect(result.autoSelect).toBe(false);
  });

  it('空节点列表返回友好提示', () => {
    const result = matchNodeByTerm('HTTP', []);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].node).toBeNull();
    expect(result.candidates[0].matchType).toBe('non-tech');
  });

  it('null-ish aliases 字段不报错', () => {
    const nodeWithNullAlias: MapNodeDocument = {
      id: 'no-alias',
      title: 'NoAlias',
      domain: 'fundamentals',
      stage: 1,
      deps: []
      // aliases 字段完全不存在
    };
    const result = matchNodeByTerm('NoAlias', [nodeWithNullAlias]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('exact');
  });

  it('trim 处理前后空格', () => {
    const result = matchNodeByTerm('  HTTP  ', mockNodes);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].matchType).toBe('exact');
  });
});

// ---------------------------------------------------------------------------
// Tests — extractTerms
// ---------------------------------------------------------------------------

describe('extractTerms', () => {
  it('支持英文逗号分隔', () => {
    expect(extractTerms('CPU, Memory, Disk')).toEqual(['CPU', 'Memory', 'Disk']);
  });

  it('支持中文逗号分隔', () => {
    expect(extractTerms('CPU，内存，磁盘')).toEqual(['CPU', '内存', '磁盘']);
  });

  it('支持顿号分隔', () => {
    expect(extractTerms('CPU、内存、磁盘')).toEqual(['CPU', '内存', '磁盘']);
  });

  it('支持空格分隔', () => {
    expect(extractTerms('CPU  Memory   Disk')).toEqual(['CPU', 'Memory', 'Disk']);
  });

  it('过滤空字符串', () => {
    expect(extractTerms('CPU,,,  ，，Memory')).toEqual(['CPU', 'Memory']);
  });

  it('trim 每个词', () => {
    expect(extractTerms('  CPU  ,  Memory  ')).toEqual(['CPU', 'Memory']);
  });
});

// ---------------------------------------------------------------------------
// Tests — 核心设计验证
// ---------------------------------------------------------------------------

describe('【设计验证】兜底匹配不是写死的', () => {
  // 验证兜底逻辑完全基于传入的 nodes，不依赖任何外部关键词库
  // "kubernet".slice(0,4) = "kubern" 被 "Kubernetes" 包含 → keywordMatch partial
  // fuzzy兜底是指 keywordMatch 完全无结果时才走的分支
  it('仅 3 节点地图中拼错输入应被 keywordMatch partial 兜底（而非 fallback fuzzy）', () => {
    const tinyMap: MapNodeDocument[] = [
      { id: 'n1', title: 'Kubernetes', domain: 'programming', stage: 5, deps: ['docker', 'linux'] },
      { id: 'n2', title: 'Docker Swarm', domain: 'network', stage: 4, deps: ['docker'] },
      { id: 'n3', title: 'Linux', domain: 'os', stage: 2, deps: [] }
    ];

    const result = matchNodeByTerm('kubernet', tinyMap);
    expect(result.candidates.some(c => c.node?.id === 'n1')).toBe(true);
    // partial 而非 fuzzy，因为 keywordMatch 部分匹配已经命中了
    expect(result.candidates[0].matchType).toBe('partial');
  });

  it('用仅包含 2 个节点的地图兜底，输入完全不相关的词返回友好提示', () => {
    const tinyMap: MapNodeDocument[] = [
      { id: 'n1', title: 'Git', domain: 'programming', stage: 1, deps: [] },
      { id: 'n2', title: 'SVN', domain: 'programming', stage: 1, deps: [] }
    ];

    const result = matchNodeByTerm('天气', tinyMap);
    expect(result.candidates[0].matchType).toBe('non-tech');
    expect(result.candidates[0].node).toBeNull();
  });
});

import { GraphData, Node } from './types';

// Level 0: Default map with 7 top-level nodes
export const defaultMap: GraphData = {
  id: 'root',
  title: '计算机世界全景',
  nodes: [
    {
      id: 'fundamentals',
      title: '计算机基础',
      domain: 'theory',
      stage: 1,
      deps: [],
      description: '计算机科学的基础理论知识，包括数字逻辑、计算机组成原理等。这是一切计算机技术的起点。',
      tags: ['理论', '基础', '入门'],
      resources: [
        { title: '计算机科学导论', url: 'https://example.com' },
      ],
    },
    {
      id: 'hardware',
      title: '硬件',
      domain: 'hardware',
      stage: 1,
      deps: ['fundamentals'],
      description: 'CPU、显卡、内存、主板等物理组件。理解硬件是理解计算机工作原理的关键。',
      tags: ['硬件', '物理', 'CPU'],
      resources: [
        { title: '硬件基础知识', url: 'https://example.com' },
      ],
    },
    {
      id: 'software',
      title: '软件系统',
      domain: 'software',
      stage: 2,
      deps: ['hardware'],
      targetMap: 'software',
      description: '操作系统、应用程序、游戏等软件。软件是运行在硬件之上的逻辑系统。',
      tags: ['软件', '应用', '操作系统'],
    },
    {
      id: 'programming',
      title: '程序开发',
      domain: 'programming',
      stage: 2,
      deps: ['fundamentals'],
      targetMap: 'programming',
      description: 'Python、JavaScript、Git、IDE 等开发工具和语言。学习编程是创造软件的第一步。',
      tags: ['编程', '开发', '语言'],
    },
    {
      id: 'ai',
      title: 'AI 人工智能',
      domain: 'ai',
      stage: 3,
      deps: ['programming', 'data'],
      targetMap: 'ai',
      description: 'ChatGPT、豆包、机器学习、深度学习等。AI 正在改变世界的每一个角落。',
      tags: ['AI', '机器学习', '深度学习'],
    },
    {
      id: 'network',
      title: '网络通信',
      domain: 'network',
      stage: 2,
      deps: ['hardware', 'software'],
      targetMap: 'network',
      description: '浏览器、WiFi、HTTP、TCP/IP 等网络技术。网络连接了全世界的计算机。',
      tags: ['网络', '通信', '互联网'],
    },
    {
      id: 'data',
      title: '数据存储',
      domain: 'software',
      stage: 2,
      deps: ['software'],
      description: '数据库、文件系统、云存储等数据管理技术。数据是信息时代最重要的资产。',
      tags: ['数据', '存储', '数据库'],
    },
  ],
};

// Level 1: Software subgraph
export const softwareMap: GraphData = {
  id: 'software',
  title: '软件系统',
  nodes: [
    { id: 'windows', title: 'Windows', domain: 'software', stage: 1, deps: [], tags: ['操作系统'] },
    { id: 'macos', title: 'macOS', domain: 'software', stage: 1, deps: [], tags: ['操作系统'] },
    { id: 'linux', title: 'Linux', domain: 'software', stage: 1, deps: [], tags: ['操作系统', '开源'] },
    { id: 'android', title: 'Android', domain: 'software', stage: 2, deps: ['linux'], tags: ['移动系统'] },
    { id: 'ios', title: 'iOS', domain: 'software', stage: 2, deps: ['macos'], tags: ['移动系统'] },
    { id: 'office', title: 'Office', domain: 'software', stage: 3, deps: ['windows'], tags: ['办公'] },
    { id: 'photoshop', title: 'Photoshop', domain: 'software', stage: 3, deps: ['windows', 'macos'], tags: ['设计'] },
    { id: 'vscode', title: 'VS Code', domain: 'software', stage: 3, deps: ['windows', 'macos', 'linux'], tags: ['编辑器'] },
    { id: 'chrome', title: 'Chrome', domain: 'software', stage:3, deps: ['windows', 'macos', 'linux'], tags: ['浏览器'] },
    { id: 'steam', title: 'Steam', domain: 'software', stage: 4, deps: ['windows'], tags: ['游戏平台'] },
    { id: 'minecraft', title: 'Minecraft', domain: 'software', stage: 5, deps: ['steam'], tags: ['游戏'] },
    { id: 'wechat', title: '微信', domain: 'software', stage: 4, deps: ['windows', 'macos', 'android', 'ios'], tags: ['社交'] },
    { id: 'tiktok', title: '抖音', domain: 'software', stage: 4, deps: ['android', 'ios'], tags: ['短视频'] },
    { id: 'notion', title: 'Notion', domain: 'software', stage: 4, deps: ['chrome'], tags: ['笔记'] },
    { id: 'figma', title: 'Figma', domain: 'software', stage: 4, deps: ['chrome'], tags: ['设计', '协作'] },
  ],
};

// Level 1: Programming subgraph
export const programmingMap: GraphData = {
  id: 'programming',
  title: '程序开发',
  nodes: [
    { id: 'scratch', title: 'Scratch', domain: 'programming', stage: 1, deps: [], tags: ['入门', '可视化'] },
    { id: 'html', title: 'HTML', domain: 'programming', stage: 1, deps: [], tags: ['网页', '标记语言'] },
    { id: 'css', title: 'CSS', domain: 'programming', stage: 2, deps: ['html'], tags: ['网页', '样式'] },
    { id: 'javascript', title: 'JavaScript', domain: 'programming', stage: 2, deps: ['html'], tags: ['网页', '编程语言'] },
    { id: 'python', title: 'Python', domain: 'programming', stage: 2, deps: [], tags: ['编程语言', '入门'] },
    { id: 'git', title: 'Git', domain: 'programming', stage: 2, deps: [], tags: ['版本控制'] },
    { id: 'react', title: 'React', domain: 'programming', stage: 3, deps: ['javascript'], tags: ['框架', '前端'] },
    { id: 'vue', title: 'Vue', domain: 'programming', stage: 3, deps: ['javascript'], tags: ['框架', '前端'] },
    { id: 'nodejs', title: 'Node.js', domain: 'programming', stage: 3, deps: ['javascript'], tags: ['后端', '运行时'] },
    { id: 'typescript', title: 'TypeScript', domain: 'programming', stage: 3, deps: ['javascript'], tags: ['编程语言', '类型'] },
    { id: 'tailwind', title: 'Tailwind CSS', domain: 'programming', stage: 3, deps: ['css'], tags: ['框架', '样式'] },
    { id: 'django', title: 'Django', domain: 'programming', stage: 3, deps: ['python'], tags: ['框架', '后端'] },
    { id: 'flask', title: 'Flask', domain: 'programming', stage: 3, deps: ['python'], tags: ['框架', '后端'] },
    { id: 'numpy', title: 'NumPy', domain: 'programming', stage: 3, deps: ['python'], tags: ['数据分析'] },
    { id: 'nextjs', title: 'Next.js', domain: 'programming', stage: 4, deps: ['react'], tags: ['框架', '全栈'] },
    { id: 'github', title: 'GitHub', domain: 'programming', stage: 4, deps: ['git'], tags: ['托管', '协作'] },
    { id: 'docker', title: 'Docker', domain: 'programming', stage: 4, deps: ['nodejs'], tags: ['容器', '部署'] },
  ],
};

// Level 1: AI subgraph
export const aiMap: GraphData = {
  id: 'ai',
  title: 'AI 人工智能',
  nodes: [
    { id: 'chatgpt', title: 'ChatGPT', domain: 'ai', stage: 1, deps: [], tags: ['大模型', '对话'] },
    { id: 'doubao', title: '豆包', domain: 'ai', stage: 1, deps: [], tags: ['大模型', '对话'] },
    { id: 'midjourney', title: 'Midjourney', domain: 'ai', stage: 1, deps: [], tags: ['AI绘画'] },
    { id: 'stable-diffusion', title: 'Stable Diffusion', domain: 'ai', stage: 2, deps: ['midjourney'], tags: ['AI绘画', '开源'] },
    { id: 'machine-learning', title: '机器学习', domain: 'ai', stage: 2, deps: [], tags: ['理论', '算法'] },
    { id: 'deep-learning', title: '深度学习', domain: 'ai', stage: 3, deps: ['machine-learning'], tags: ['理论', '神经网络'] },
    { id: 'pytorch', title: 'PyTorch', domain: 'ai', stage: 3, deps: ['deep-learning', 'python'], tags: ['框架', '训练'] },
    { id: 'tensorflow', title: 'TensorFlow', domain: 'ai', stage: 3, deps: ['deep-learning', 'python'], tags: ['框架', '训练'] },
    { id: 'opencv', title: 'OpenCV', domain: 'ai', stage: 3, deps: ['python'], tags: ['计算机视觉'] },
    { id: 'nlp', title: '自然语言处理', domain: 'ai', stage: 3, deps: ['machine-learning'], tags: ['NLP', '文本'] },
    { id: 'transformer', title: 'Transformer', domain: 'ai', stage: 4, deps: ['deep-learning', 'nlp'], tags: ['架构', '注意力机制'] },
    { id: 'llm', title: '大语言模型', domain: 'ai', stage: 5, deps: ['transformer'], tags: ['LLM', 'GPT'] },
    { id: 'rag', title: 'RAG', domain: 'ai', stage: 4, deps: ['llm'], tags: ['检索增强'] },
    { id: 'langchain', title: 'LangChain', domain: 'ai', stage: 4, deps: ['llm'], tags: ['框架', '工具链'] },
  ],
};

// Level 1: Network subgraph
export const networkMap: GraphData = {
  id: 'network',
  title: '网络通信',
  nodes: [
    { id: 'wifi', title: 'WiFi', domain: 'network', stage: 1, deps: [], tags: ['无线'] },
    { id: 'ethernet', title: '以太网', domain: 'network', stage: 1, deps: [], tags: ['有线'] },
    { id: 'ip', title: 'IP 协议', domain: 'network', stage: 2, deps: ['wifi', 'ethernet'], tags: ['协议', '网络层'] },
    { id: 'tcp', title: 'TCP', domain: 'network', stage: 2, deps: ['ip'], tags: ['协议', '传输层'] },
    { id: 'udp', title: 'UDP', domain: 'network', stage: 2, deps: ['ip'], tags: ['协议', '传输层'] },
    { id: 'http', title: 'HTTP', domain: 'network', stage: 3, deps: ['tcp'], tags: ['协议', '应用层'] },
    { id: 'https', title: 'HTTPS', domain: 'network', stage: 3, deps: ['http'], tags: ['协议', '加密'] },
    { id: 'dns', title: 'DNS', domain: 'network', stage: 3, deps: ['udp'], tags: ['域名解析'] },
    { id: 'cdn', title: 'CDN', domain: 'network', stage: 4, deps: ['http', 'dns'], tags: ['加速', '分发'] },
    { id: 'websocket', title: 'WebSocket', domain: 'network', stage: 4, deps: ['http'], tags: ['实时通信'] },
    { id: 'rest-api', title: 'REST API', domain: 'network', stage: 4, deps: ['http'], tags: ['API', '接口'] },
    { id: 'graphql', title: 'GraphQL', domain: 'network', stage: 4, deps: ['http'], tags: ['API', '查询语言'] },
    { id: 'vpn', title: 'VPN', domain: 'network', stage: 4, deps: ['ip'], tags: ['虚拟网络', '安全'] },
    { id: '5g', title: '5G', domain: 'network', stage: 3, deps: ['wifi'], tags: ['移动网络'] },
  ],
};

export const allMaps: Record<string, GraphData> = {
  root: defaultMap,
  software: softwareMap,
  programming: programmingMap,
  ai: aiMap,
  network: networkMap,
};
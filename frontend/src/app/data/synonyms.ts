/**
 * Curated synonym/alias dictionary for CWF search.
 *
 * Maps non-standard or informal Chinese terms to standard node search tokens.
 * Designed so that rule-based matching handles the vast majority of beginner
 * queries without needing semantic search.
 *
 * Format: key → array of search tokens matched against node title/tags/aliases.
 */

const SYNONYM_MAP: Record<string, string[]> = {
  // ═══════════════════════════════════════════════════════════════
  // OS & Platforms
  // ═══════════════════════════════════════════════════════════════
  '苹果系统': ['macOS', 'macos', 'mac', 'macOS-lang'],
  '苹果电脑': ['macOS', 'mac', 'MacBook', 'iMac'],
  'mac': ['macOS', 'macos', 'MacBook', 'iMac'],
  '微软系统': ['Windows', 'windows'],
  '视窗': ['Windows', 'windows'],
  'linux': ['Linux', 'ubuntu', 'debian', 'centos'],
  'ubuntu': ['Linux', 'linux', 'debian'],
  '安卓': ['Android', 'android'],
  'android': ['Android'],
  '鸿蒙': ['HarmonyOS', 'harmony'],
  'ios': ['iOS', 'Swift', 'swift'],
  '苹果手机': ['iOS', 'iPhone', 'Swift'],

  // ═══════════════════════════════════════════════════════════════
  // Web Development
  // ═══════════════════════════════════════════════════════════════
  '做网页': ['HTML', 'CSS', 'JavaScript', 'web', 'frontend', 'web-frontend', '前端'],
  '写网页': ['HTML', 'CSS', 'JavaScript', 'frontend', 'web-frontend'],
  '渲染界面': ['HTML', 'CSS', 'JavaScript', 'Web 前端', 'frontend', '前端', '样式', '布局'],
  '渲染界面的语言': ['HTML', 'CSS', 'JavaScript', 'Web 前端', 'frontend', '前端'],
  '界面语言': ['HTML', 'CSS', 'JavaScript', 'Web 前端', 'frontend'],
  '页面语言': ['HTML', 'CSS', 'JavaScript', 'Web 前端', 'frontend'],
  '做界面': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'frontend', '前端'],
  '写界面': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'frontend', '前端'],
  '页面样式': ['CSS', 'HTML', 'Tailwind CSS', 'frontend-styling', '样式', '布局'],
  '界面样式': ['CSS', 'HTML', 'Tailwind CSS', 'frontend-styling', '样式', '布局'],
  '网页开发': ['HTML', 'CSS', 'JavaScript', 'frontend', 'React', 'Vue'],
  '前端': ['frontend', 'web-frontend', 'HTML', 'CSS', 'JavaScript', 'React', 'Vue'],
  '前端开发': ['frontend', 'React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript'],
  '后端': ['backend', 'web-backend', 'server', 'Node.js', 'Django', 'Python', 'Java'],
  '后端开发': ['backend', 'Node.js', 'Django', 'Spring', 'Python', 'Java', 'Go'],
  '服务端': ['backend', 'server', 'Node.js', 'Django', 'Spring'],
  '做网站': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'frontend', 'backend', 'Node.js'],
  '搭建网站': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Node.js', 'frontend', 'backend'],
  '全栈': ['fullstack', 'frontend', 'backend', 'React', 'Node.js', 'JavaScript'],
  'web': ['HTML', 'CSS', 'JavaScript', 'frontend', 'HTTP', 'browser'],
  '网页': ['HTML', 'CSS', 'JavaScript', 'web', 'frontend', 'browser'],
  '网站': ['web', 'HTML', 'CSS', 'JavaScript', 'frontend', 'backend'],
  '网页设计': ['HTML', 'CSS', 'UI', 'design', 'frontend', 'Figma'],
  '响应式': ['responsive', 'CSS', 'HTML', 'media query', 'frontend'],

  // ═══════════════════════════════════════════════════════════════
  // Desktop & Mobile App Development
  // ═══════════════════════════════════════════════════════════════
  '桌面应用': ['Electron', 'Tauri', 'Qt', 'WPF', 'desktop-development', 'desktop', '桌面端开发'],
  '桌面程序': ['Electron', 'Tauri', 'Qt', 'WPF', 'WinForms', 'desktop-development', 'desktop'],
  '桌面软件': ['Electron', 'Tauri', 'Qt', 'WPF', 'WinForms', 'desktop-development', 'desktop'],
  '桌面app': ['Electron', 'Tauri', 'Qt', 'WPF', 'desktop-development', 'desktop'],
  '桌面': ['Electron', 'Tauri', 'Qt', 'WPF', 'desktop-development', 'desktop', 'desktop-cpp-stack', 'desktop-js-stack'],
  '客户端': ['Electron', 'Tauri', 'Qt', 'WPF', 'desktop-development', 'Android', 'iOS', 'Flutter', 'Swift', 'Kotlin'],
  '手机app': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '手机应用': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '移动app': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '移动应用': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '移动开发': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '移动端': ['Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin', '移动端开发'],
  '做app': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'mobile', 'desktop'],
  '开发app': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'mobile', 'desktop'],
  '写app': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'mobile', 'desktop'],
  '制作app': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'mobile', 'desktop'],
  'app开发': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'desktop-development'],
  '制作': ['开发', 'programming', 'development', '编程', '软件开发'],
  '开发': ['development', 'programming', '编程'],
  'app': ['Android', 'iOS', 'Flutter', 'React Native', 'Electron', 'Tauri', 'mobile', 'desktop', '移动端开发', '桌面端开发'],
  '跨平台': ['Flutter', 'React Native', 'Electron', 'Tauri', 'Qt', '跨平台'],
  'electron': ['Electron', 'desktop', 'JavaScript', 'Node.js', 'Chromium', '跨平台'],
  'tauri': ['Tauri', 'desktop', 'Rust', '跨平台'],
  'react native': ['React Native', 'mobile', 'Android', 'iOS', '跨平台'],
  'flutter': ['Flutter', 'Dart', 'Android', 'iOS', 'mobile', '移动端开发'],
  'weex': ['Weex', 'mobile', '跨平台', 'Vue', 'Android', 'iOS'],
  'qt': ['Qt', 'C++', 'desktop', '跨平台', 'desktop-cpp-stack'],
  'wpf': ['WPF', 'C#', 'Windows', 'desktop', 'XAML', 'desktop-dotnet-stack'],
  'winforms': ['WinForms', 'C#', 'Windows', 'desktop', 'desktop-dotnet-stack'],

  // ═══════════════════════════════════════════════════════════════
  // AI / ML — the most important category for current trends
  // ═══════════════════════════════════════════════════════════════
  '人工智能': ['AI', 'machine learning', 'deep learning', 'neural network', 'ChatGPT'],
  'AI': ['machine learning', 'deep learning', 'ChatGPT', 'Claude', 'transformer'],
  'ai': ['machine learning', 'deep learning', 'ChatGPT', 'transformer'],
  '机器学习': ['machine learning', 'ML', 'deep learning', 'supervised learning'],
  '深度学习': ['deep learning', 'CNN', 'RNN', 'transformer', 'neural network'],
  '神经网络': ['neural network', 'deep learning', 'CNN', 'RNN', 'LSTM', 'transformer'],
  'AI画图': ['Midjourney', 'Stable Diffusion', 'DALL-E', 'Flux', '扩散模型'],
  'AI绘图': ['Midjourney', 'Stable Diffusion', 'DALL-E', 'Flux', 'diffusion model'],
  'AI画画': ['Midjourney', 'Stable Diffusion', 'DALL-E', 'Flux'],
  'AI生成图片': ['Midjourney', 'Stable Diffusion', 'DALL-E', '扩散模型'],
  'AI生成视频': ['Sora', '视频生成'],
  'AI做视频': ['Sora'],
  'AI聊天': ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Kimi', '豆包'],
  'AI对话': ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Kimi'],
  'AI助手': ['ChatGPT', 'Claude', 'Gemini', 'Kimi', '豆包', 'DeepSeek'],
  'AI写代码': ['Cursor', 'GitHub Copilot', 'Copilot', 'AI Agent'],
  'AI编程': ['Cursor', 'GitHub Copilot', 'Copilot'],
  'AI代码': ['Cursor', 'GitHub Copilot', 'Copilot'],
  '大模型': ['LLM', '大语言模型', 'GPT', 'Llama', 'ChatGPT', 'Claude', 'transformer'],
  '语言模型': ['LLM', 'GPT', 'Llama', 'ChatGPT', 'Claude', 'BERT'],
  'llm': ['大语言模型', 'GPT', 'Llama', 'ChatGPT', 'RAG', 'transformer'],
  'gpt': ['GPT', 'ChatGPT', 'OpenAI API', 'transformer'],
  'chatgpt': ['ChatGPT', 'OpenAI API', 'GPT'],
  'claude': ['Claude', 'Claude API'],
  'openai': ['ChatGPT', 'GPT', 'DALL-E', 'OpenAI API', 'Sora'],
  'deepseek': ['DeepSeek', 'deepseek'],
  'rag': ['RAG', '检索增强生成', 'LangChain', 'embedding'],
  '向量数据库': ['vector database', 'embedding', 'RAG', '语义搜索'],
  'agent': ['AI Agent', 'LangChain', 'LangGraph', 'CrewAI', 'AutoGen'],
  '多模态': ['multimodal', 'Gemini', '视觉', '语音识别'],
  '扩散模型': ['diffusion model', 'Stable Diffusion', 'DALL-E', 'Flux', 'GAN'],
  'gan': ['GAN', '生成对抗网络', 'Stable Diffusion'],
  '自然语言处理': ['NLP', 'BERT', 'transformer', '机器翻译', '文本分类'],
  'nlp': ['NLP', 'BERT', 'transformer', '机器翻译', '文本摘要'],
  '计算机视觉': ['computer vision', 'CNN', 'CNN', '目标检测', '人脸识别', 'OCR'],
  '图像识别': ['computer vision', 'CNN', '目标检测', 'image recognition'],
  '语音识别': ['speech recognition', '语音', 'ASR'],
  '语音合成': ['TTS', 'text to speech', '语音'],
  '推荐系统': ['recommendation system', '推荐算法', '个性化推荐'],
  '推荐算法': ['recommendation system', '推荐系统'],
  '自动驾驶': ['autonomous driving', 'computer vision', '特斯拉', 'Tesla'],
  '机器人': ['robotics', 'AI', '强化学习', 'computer vision'],
  '量化': ['quantization', '推理优化', '模型压缩'],
  '微调': ['fine-tuning', 'LoRA', 'RLHF', '迁移学习'],
  '预训练': ['pre-training', 'GPT', 'BERT', 'transformer'],
  '提示词': ['prompt', 'prompt engineering', 'LLM', 'ChatGPT'],
  'prompt': ['prompt engineering', 'LLM', 'ChatGPT'],

  // ═══════════════════════════════════════════════════════════════
  // Programming Languages
  // ═══════════════════════════════════════════════════════════════
  '写代码': ['Python', 'JavaScript', 'Java', 'programming', '编程'],
  '编程语言': ['Python', 'JavaScript', 'Java', 'C++', 'Go', 'Rust', 'TypeScript'],
  '脚本语言': ['Python', 'JavaScript', 'Ruby', 'PHP', 'TypeScript'],
  '编译语言': ['C++', 'Rust', 'Go', 'Java', 'C#'],
  '学编程': ['Python', 'JavaScript', 'programming', '编程', '入门'],
  '编程入门': ['Python', 'JavaScript', '编程', 'programming'],
  '新手编程': ['Python', 'JavaScript', '入门', 'programming'],
  '初学编程': ['Python', 'JavaScript', 'programming', '入门'],
  '学什么语言': ['Python', 'JavaScript', 'Java', 'Go', 'programming'],
  'python': ['Python', 'Django', 'Flask', 'FastAPI', 'PyTorch'],
  'javascript': ['JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue', '前端'],
  'js': ['JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue'],
  'ts': ['TypeScript', 'JavaScript', '前端'],
  'java': ['Java', 'Spring', 'Kotlin', 'Android'],
  'c语言': ['C', 'C++', 'C++', 'system programming'],
  'c++': ['C++', 'cpp', 'C', 'system programming'],
  'cpp': ['C++', 'C', 'system programming'],
  'rust': ['Rust', 'rust-lang', 'system programming'],
  'go语言': ['Go', 'go-lang', 'Golang'],
  'golang': ['Go', 'go-lang'],
  'ruby': ['Ruby', 'Rails'],
  'php': ['PHP', 'Laravel', 'WordPress'],
  'swift': ['Swift', 'iOS', 'SwiftUI'],
  'kotlin': ['Kotlin', 'Android', 'Java'],
  'dart': ['Dart', 'Flutter'],
  'react': ['React', 'React Native', 'Next.js', '前端', 'JavaScript'],
  'vue': ['Vue', 'Nuxt', '前端', 'JavaScript'],
  'angular': ['Angular', '前端', 'TypeScript'],

  // ═══════════════════════════════════════════════════════════════
  // Networking
  // ═══════════════════════════════════════════════════════════════
  '上网': ['HTTP', 'DNS', 'TCP/IP', 'browser', '网络', 'network', '互联网'],
  '网络': ['network', 'HTTP', 'TCP/IP', 'DNS', 'internet', '互联网', 'TCP', 'UDP'],
  '通信': ['network', 'HTTP', 'TCP', 'UDP', 'protocol', 'WebSocket'],
  '互联网': ['internet', 'web', 'HTTP', 'DNS', 'network', '浏览器'],
  'wifi': ['WiFi', 'wireless', '无线', 'WLAN'],
  '无线': ['WiFi', 'wireless', 'Bluetooth', '蓝牙'],
  '蓝牙': ['Bluetooth', 'wireless', '无线'],
  '路由器': ['router', 'network', 'WiFi', '网关'],
  '交换机': ['switch', 'network', '网络设备'],
  '防火墙': ['firewall', 'network security', '网络安全', 'WAF'],
  'vpn': ['VPN', 'network security', '代理', 'proxy'],
  '代理': ['proxy', 'VPN', '反向代理', 'Nginx'],
  'dns': ['DNS', '域名', 'network'],
  '域名': ['domain', 'DNS', '网站'],
  'http': ['HTTP', 'HTTPS', 'web', 'REST API', 'protocol'],
  'https': ['HTTPS', 'HTTP', 'SSL', 'TLS', '安全'],
  'tcp': ['TCP', 'TCP/IP', 'protocol', '网络协议'],
  'udp': ['UDP', 'protocol', '网络协议'],
  'ip': ['IP', 'TCP/IP', 'IP地址', 'network'],
  'websocket': ['WebSocket', '实时通信', 'SSE'],
  'api': ['API', 'REST API', 'RESTful API', 'GraphQL', 'gRPC'],
  'rest': ['REST API', 'RESTful API', 'API', 'HTTP'],
  'graphql': ['GraphQL', 'API'],
  'grpc': ['gRPC', 'RPC', 'protobuf'],
  '微服务': ['microservices', 'Docker', 'Kubernetes', 'gRPC', '服务网格'],
  '负载均衡': ['load balancer', 'Nginx', '反向代理', 'HAProxy'],
  'cdn': ['CDN', '缓存', '静态资源'],

  // ═══════════════════════════════════════════════════════════════
  // Hardware
  // ═══════════════════════════════════════════════════════════════
  '芯片': ['CPU', 'GPU', 'processor', '处理器', '半导体'],
  '处理器': ['CPU', 'processor'],
  'cpu': ['CPU', 'processor', '处理器', '芯片'],
  '显卡': ['GPU', 'graphics card', 'NVIDIA', 'AMD', '显存'],
  'gpu': ['GPU', 'NVIDIA', 'graphics card', '显卡'],
  'nvidia': ['GPU', 'NVIDIA', 'CUDA', '显卡'],
  '内存': ['RAM', 'memory', 'DDR'],
  'ram': ['RAM', 'memory', '内存'],
  '硬盘': ['SSD', 'HDD', 'storage', 'disk', '存储'],
  'ssd': ['SSD', 'storage', 'NVMe', '硬盘'],
  '主板': ['motherboard', '硬件', 'hardware'],
  '电源': ['PSU', 'power supply', '硬件'],
  '散热': ['cooling', '风扇', '水冷', 'CPU'],
  'usb': ['USB', '接口', '外设', 'Type-C'],
  '显示器': ['monitor', 'display', '屏幕', '分辨率'],
  '键盘': ['keyboard', '外设', '输入设备'],
  '鼠标': ['mouse', '外设', '输入设备'],

  // ═══════════════════════════════════════════════════════════════
  // Databases
  // ═══════════════════════════════════════════════════════════════
  '数据库': ['database', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQL'],
  'sql': ['SQL', 'MySQL', 'PostgreSQL', 'database', '数据库'],
  'mysql': ['MySQL', 'SQL', 'database', '数据库'],
  'nosql': ['NoSQL', 'MongoDB', 'Redis', 'Cassandra'],
  '缓存': ['Redis', 'cache', 'Memcached', 'CDN'],
  'redis': ['Redis', '缓存', 'cache'],
  'orm': ['ORM', 'Prisma', 'TypeORM', 'SQLAlchemy'],

  // ═══════════════════════════════════════════════════════════════
  // DevOps & Tools
  // ═══════════════════════════════════════════════════════════════
  '容器': ['Docker', 'Kubernetes', 'container', 'Podman'],
  'docker': ['Docker', '容器', 'container', 'Kubernetes'],
  'k8s': ['Kubernetes', 'Docker', '容器编排', '容器'],
  'kubernetes': ['Kubernetes', 'Docker', '容器', '服务网格'],
  '部署': ['deploy', 'Docker', 'CI/CD', 'Kubernetes', 'Nginx'],
  'ci/cd': ['CI/CD', 'GitHub Actions', 'Jenkins', 'GitLab CI', '部署'],
  'devops': ['DevOps', 'CI/CD', 'Docker', 'Kubernetes', '自动化运维'],
  '运维': ['DevOps', 'Linux', 'Docker', 'Kubernetes', '监控'],
  '版本管理': ['Git', 'GitHub', 'version control', 'GitLab'],
  'git': ['Git', 'GitHub', 'GitLab', 'version control'],
  'github': ['GitHub', 'Git', 'GitHub Actions', '代码托管'],
  '代码托管': ['GitHub', 'GitLab', 'Git', '版本管理'],
  '编辑器': ['VS Code', 'VSCode', 'Cursor', 'IDE', 'editor', 'Neovim', 'Vim'],
  'ide': ['IDE', 'VS Code', 'IntelliJ', 'Cursor', '编辑器'],
  'vscode': ['VS Code', 'VSCode', '编辑器', 'IDE'],
  '终端': ['terminal', '命令行', 'Shell', 'Bash', 'Zsh', 'Linux'],
  '命令行': ['CLI', 'terminal', 'Shell', 'Bash', 'Linux'],
  'shell': ['Shell', 'Bash', 'Zsh', 'terminal', 'Linux'],

  // ═══════════════════════════════════════════════════════════════
  // Software Applications
  // ═══════════════════════════════════════════════════════════════
  '浏览器': ['browser', 'Chrome', 'Firefox', 'Edge', 'Safari'],
  'chrome': ['Chrome', 'browser', '浏览器', 'Chromium'],
  'firefox': ['Firefox', 'browser', '浏览器'],
  '办公软件': ['Office', 'Word', 'Excel', 'PowerPoint', 'WPS'],
  'office': ['Office', 'Word', 'Excel', 'PowerPoint', 'Microsoft'],
  '文档': ['Word', 'Google Docs', 'Markdown', 'Notion', 'Office'],
  '表格': ['Excel', 'Google Sheets', 'WPS', 'Office'],
  'ppt': ['PowerPoint', 'Keynote', '演示', 'Office'],
  '做ppt': ['PowerPoint', 'Keynote', '演示'],
  '做表格': ['Excel', 'Google Sheets', '表格'],
  '笔记': ['Notion', 'Obsidian', 'Evernote', 'OneNote', 'Markdown'],
  'notion': ['Notion'],
  '设计工具': ['Figma', 'Sketch', 'Adobe XD', 'Photoshop'],
  'figma': ['Figma', '设计工具', 'UI设计'],
  'ps': ['Photoshop', 'Adobe', '图像处理'],
  'photoshop': ['Photoshop', 'Adobe', '图像处理'],
  'p图': ['Photoshop', 'GIMP', '图像处理'],
  '剪视频': ['Premiere', 'DaVinci', 'Final Cut Pro', '视频编辑'],
  '视频编辑': ['Premiere', 'DaVinci', 'Final Cut Pro', '剪辑'],
  '做音乐': ['Ableton', 'FL Studio', 'Logic Pro', '音频'],
  '3d建模': ['Blender', 'Maya', '3ds Max', 'Cinema 4D'],
  'blender': ['Blender', '3D建模', '3D'],
  'cad': ['AutoCAD', 'SolidWorks', 'CAD', '工程'],
  '游戏引擎': ['Unity', 'Unreal', 'Godot', '游戏开发'],
  'unity': ['Unity', 'C#', '游戏开发', '游戏引擎'],
  'unreal': ['Unreal Engine', 'C++', '游戏开发', '游戏引擎'],
  '做游戏': ['Unity', 'Unreal', 'Godot', '游戏开发', 'C++', 'C#'],
  '游戏开发': ['Unity', 'Unreal', 'Godot', '游戏引擎', 'C++', 'C#'],

  // ═══════════════════════════════════════════════════════════════
  // Concepts — "what is X" / "how does X work"
  // ═══════════════════════════════════════════════════════════════
  '操作系统': ['OS', 'operating system', 'Linux', 'Windows', 'macOS', 'kernel'],
  'os': ['operating system', '操作系统', 'Linux', 'Windows', 'macOS'],
  '计算机基础': ['计算机组成原理', '操作系统', '数据结构', '算法', 'fundamentals'],
  '算法': ['algorithm', 'sort', 'search', '数据结构', 'data structure'],
  '数据结构': ['data structure', 'algorithm', 'array', 'tree', 'hash', 'stack', 'queue'],
  '安全': ['security', 'encryption', 'HTTPS', 'SSL', 'TLS', '网络安全', '防火墙'],
  '网络安全': ['network security', 'firewall', 'HTTPS', 'SSL', 'WAF', 'encryption'],
  '加密': ['encryption', 'SSL', 'TLS', 'HTTPS', 'security', '密码学'],
  '密码学': ['cryptography', 'encryption', 'SSL', 'TLS', 'security'],
  '黑客': ['hacker', 'security', 'penetration testing', '网络安全', '渗透测试'],
  '渗透': ['penetration testing', 'security', '黑客', 'Kali Linux'],
  '虚拟化': ['virtualization', 'VMware', 'VirtualBox', 'Docker', 'KVM'],
  '虚拟机': ['VMware', 'VirtualBox', 'virtualization', 'KVM'],
  '云计算': ['cloud computing', 'AWS', 'Azure', 'Google Cloud', '阿里云'],
  '云服务': ['AWS', 'Azure', 'Google Cloud', '阿里云', 'cloud computing'],
  'aws': ['AWS', 'Amazon', 'Amazon Web Services', 'cloud computing', '云计算'],
  '阿里云': ['Aliyun', 'cloud computing', '云计算'],
  '服务器': ['server', 'Linux', 'Nginx', 'Apache', 'cloud computing', '后端'],
  'linux服务器': ['Linux', 'server', 'Nginx', 'Ubuntu', 'CentOS'],
  '区块链': ['blockchain', 'Bitcoin', 'Ethereum', 'cryptocurrency', '智能合约'],
  '比特币': ['Bitcoin', 'blockchain', 'cryptocurrency', '数字货币'],
  '以太坊': ['Ethereum', 'blockchain', '智能合约', 'Solidity'],
  'web3': ['Web3', 'blockchain', 'Ethereum', '智能合约', 'DApp'],
  '物联网': ['IoT', '嵌入式系统', 'ESP32', 'Arduino', '传感器'],
  'iot': ['IoT', '物联网', '嵌入式系统', 'ESP32', 'Arduino'],
  '嵌入式': ['embedded', '嵌入式系统', 'Arduino', 'ESP32', 'FreeRTOS', '单片机'],
  'arduino': ['Arduino', '嵌入式', 'IoT', '单片机'],
  '树莓派': ['Raspberry Pi', '嵌入式', 'Linux', 'IoT'],
  '大数据': ['big data', 'Hadoop', 'Spark', 'Flink', '数据分析'],
  '数据分析': ['data analysis', 'Python', 'Pandas', 'NumPy', '大数据'],
  '数据科学': ['data science', 'Python', 'machine learning', '数据分析'],
  '正则': ['regex', 'regular expression', '文本处理'],
  '正则表达式': ['regex', 'regular expression'],

  // ═══════════════════════════════════════════════════════════════
  // Companies & Products — "那个做XX的公司"
  // ═══════════════════════════════════════════════════════════════
  '谷歌': ['Google', 'Chrome', 'Android', 'TensorFlow', 'Gemini'],
  'google': ['Google', 'Chrome', 'Android', 'TensorFlow', 'Gemini'],
  '微软': ['Microsoft', 'Windows', 'VS Code', 'GitHub', 'Azure', 'Office', 'TypeScript'],
  'microsoft': ['Microsoft', 'Windows', 'VS Code', 'GitHub', 'Azure', 'TypeScript'],
  '苹果': ['Apple', 'macOS', 'iOS', 'Swift', 'iPhone', 'MacBook'],
  'apple': ['Apple', 'macOS', 'iOS', 'Swift', 'iPhone'],
  '亚马逊': ['Amazon', 'AWS', 'Alexa', 'cloud computing'],
  'meta': ['Meta', 'Facebook', 'React', 'Llama', 'PyTorch'],
  '字节跳动': ['ByteDance', 'TikTok', '豆包', '抖音'],
  '阿里': ['Alibaba', '阿里云', '通义千问', 'Qwen', '淘宝'],
  '腾讯': ['Tencent', '微信', 'WeChat', '腾讯云'],
  '百度': ['Baidu', '文心一言', '搜索引擎'],
  '华为': ['Huawei', 'HarmonyOS', '鸿蒙'],
  '英伟达': ['NVIDIA', 'GPU', 'CUDA', '显卡'],
  'intel': ['Intel', 'CPU', '处理器'],
  'amd': ['AMD', 'CPU', 'GPU', '显卡'],
  '特斯拉': ['Tesla', '自动驾驶', 'FSD'],

  // ═══════════════════════════════════════════════════════════════
  // Problem / troubleshooting — "电脑太慢" / "连不上网"
  // ═══════════════════════════════════════════════════════════════
  '电脑慢': ['CPU', 'RAM', 'SSD', 'performance', '优化'],
  '电脑卡': ['CPU', 'RAM', 'SSD', 'performance', '优化'],
  '电脑热': ['CPU', 'cooling', '散热', 'GPU'],
  '连不上网': ['WiFi', 'DNS', 'network', '路由器', 'IP'],
  '断网': ['network', 'WiFi', 'DNS', '路由器'],
  '蓝屏': ['Windows', '操作系统', 'driver', '硬件'],
  '中毒': ['virus', 'malware', 'security', '杀毒软件'],
  '病毒': ['virus', 'malware', 'antivirus', 'security'],
  '数据恢复': ['backup', 'recovery', '文件恢复', 'storage'],
  '文件恢复': ['backup', 'recovery', 'storage'],

  // ═══════════════════════════════════════════════════════════════
  // Learning path / beginner questions
  // ═══════════════════════════════════════════════════════════════
  '怎么学': ['入门', 'Python', 'fundamentals', 'tutorial', '编程', '计算机基础'],
  '入门': ['Python', 'JavaScript', 'fundamentals', '编程', '计算机基础'],
  '新手': ['入门', 'Python', 'JavaScript', 'fundamentals', '编程'],
  '零基础': ['入门', 'Python', 'JavaScript', 'fundamentals', '编程', '计算机基础'],
  '自学': ['Python', 'JavaScript', '编程', '入门', 'fundamentals'],
  '学习路线': ['Python', 'JavaScript', '编程', '计算机基础', '前端', '后端'],
  '学习路径': ['Python', 'JavaScript', '编程', '计算机基础'],
  '找工作': ['Python', 'JavaScript', 'Java', 'React', '前端', '后端', '面试'],
  '面试': ['algorithm', '数据结构', '系统设计', '编程', 'Python', 'JavaScript'],
  '刷题': ['algorithm', 'LeetCode', '数据结构', '编程'],
  'leetcode': ['LeetCode', 'algorithm', '数据结构', '面试', '刷题'],
  '转行': ['入门', 'Python', 'JavaScript', '编程', '计算机基础', '前端'],
  '计算机专业': ['计算机基础', '操作系统', '数据结构', '算法', '计算机网络'],
  '考研': ['数据结构', '操作系统', '计算机网络', '计算机基础', '算法'],
  '期末考试': ['计算机基础', '数据结构', '算法', '操作系统', '计算机网络'],

  // ═══════════════════════════════════════════════════════════════
  // Architecture & Design Patterns
  // ═══════════════════════════════════════════════════════════════
  '设计模式': ['design pattern', 'MVC', 'Singleton', 'Factory', '架构设计'],
  'mvc': ['MVC', '设计模式', '架构', '架构设计'],
  'mvvm': ['MVVM', 'Vue', 'React', '设计模式'],
  '架构设计': ['architecture', '微服务', 'MVC', 'RESTful API', '系统设计'],
  '系统设计': ['system design', '架构设计', '微服务', '分布式'],
  '分布式': ['distributed system', '微服务', 'Kubernetes', '一致性'],
  '高并发': ['并发', '并发编程', 'load balancer', '缓存', '消息队列'],
  '消息队列': ['message queue', 'Kafka', 'RabbitMQ', 'MQ', '异步'],
  'kafka': ['Kafka', '消息队列', '消息中间件', 'streaming'],
  'rabbitmq': ['RabbitMQ', '消息队列', '消息中间件'],
  'oop': ['OOP', '面向对象', 'Java', 'C++', '设计模式'],
  '面向对象': ['OOP', 'Java', 'C++', '设计模式'],
  '函数式': ['functional programming', 'Haskell', 'Scala', 'Rust'],
}

/**
 * Expands a search query with known synonyms.
 * Returns deduplicated variants including the original query.
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const normalized = query.trim()
  if (!normalized) return []

  const variants = new Set<string>()
  variants.add(normalized)
  variants.add(normalized.toLowerCase())

  const lowerQuery = normalized.toLowerCase()

  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    // Match if the query contains the key OR the key contains the query
    if (lowerQuery.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerQuery)) {
      for (const synonym of synonyms) {
        variants.add(synonym)
        variants.add(synonym.toLowerCase())
      }
      // Also add the key itself as a search variant
      variants.add(key)
    }
  }

  return Array.from(variants)
}

export { SYNONYM_MAP }

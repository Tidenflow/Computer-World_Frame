# UI 设计说明文档

## 概述

本文档详细描述了 React Demo 的 UI 设计规范，可作为 Vue 重构的参考。该项目是一个知识图谱可视化应用，采用深色科技风格主题。

---

## 1. 色彩系统

### 1.1 主色调

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 背景色 | `#020617` (slate-950) | 主背景 |
| 卡片背景 | `#0f172a` (slate-900) | 面板、侧边栏 |
| 卡片背景半透明 | `slate-900/80` | 带模糊效果的背景 |
| 边框色 | `#334155` (slate-700) | 分隔线、卡片边框 |
| 深边框 | `#1e293b` (slate-800) | 内部元素边框 |

### 1.2 强调色

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主渐变起点 | `#2563eb` (blue-600) | 按钮、图标背景 |
| 主渐变终点 | `#0891b2` (cyan-600) | 按钮、图标背景 |
| 强调文字 | `#38bdf8` (sky-400) | 蓝色渐变文字 |
| 成功色 | `#22c55e` (green-500) | 匹配成功反馈 |
| 高亮色 | `#60a5fa` (blue-400) | 节点高亮、进度条 |

### 1.3 文字色

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主文字 | `#f8fafc` (slate-50) | 标题、重要内容 |
| 次要文字 | `#cbd5e1` (slate-300) | 正文内容 |
| 辅助文字 | `#94a3b8` (slate-400) | 描述、提示 |
| 弱化文字 | `#64748b` (slate-500) | 图例、统计数字 |

---

## 2. 排版系统

### 2.1 字体

- 主字体：`Inter`（系统默认 sans-serif）
- 字重：400（正文）、500（中等）、600（半粗）、700（粗体）
- 行高：1.5

### 2.2 字号

| 元素 | 字号 | 字重 |
|------|------|------|
| 大标题 | 24px (text-3xl) | 700 |
| 标题 | 20px (text-xl) | 600 |
| 副标题 | 16px (text-lg) | 600 |
| 正文 | 14px (text-sm) | 400 |
| 小字 | 12px (text-xs) | 400 |

---

## 3. 布局结构

### 3.1 整体布局

```
┌─────────────────────────────────────────┐
│ Header (固定顶部, z-40)                  │
├─────────────────────────────────────────┤
│ 关于面板 (可展开/折叠)                   │
├─────────────────────────────────────────┤
│ ┌──────────┬────────────────────────┐   │
│ │          │                        │   │
│ │ 侧边栏   │   知识图谱可视化区域    │   │
│ │ (1/4)    │   (3/4)                │   │
│ │          │                        │   │
│ └──────────┴────────────────────────┘   │
├─────────────────────────────────────────┤
│ Footer                                   │
└─────────────────────────────────────────┘
```

### 3.2 响应式断点

- 移动端：`grid-cols-1`（单列）
- 桌面端：`lg:grid-cols-4`（左侧 1/4，右侧 3/4）

### 3.3 间距系统

- 容器内边距：`container mx-auto px-4`
- 区块间距：`gap-6`（24px）
- 卡片内边距：`p-4`（16px）或 `p-6`（24px）

---

## 4. 组件设计

### 4.1 Header 组件

```tsx
// 结构
<header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      {/* Logo + 标题区 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Computer World Frame
          </h1>
          <p className="text-xs text-slate-500">点亮你的计算机世界观</p>
        </div>
      </div>
      {/* 右侧图标按钮 */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm"><Info className="w-4 h-4" /></Button>
        <a><Github className="w-5 h-5" /></a>
      </div>
    </div>
  </div>
</header>
```

**设计要点：**
- 固定顶部 `sticky top-0`
- 半透明背景 `bg-slate-900/50 backdrop-blur-sm`
- Logo 使用渐变背景 `from-blue-600 to-cyan-600`
- 标题使用渐变文字效果

### 4.2 搜索栏组件

```tsx
<div className="relative w-full max-w-2xl">
  <div className="relative flex gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <Input 
        className="pl-10 pr-4 py-6 text-lg bg-slate-800/50 border-slate-700 
                   text-slate-100 placeholder:text-slate-500 
                   focus:border-blue-500 focus:ring-blue-500/20"
        placeholder="输入任何计算机相关的术语..."
      />
    </div>
    <Button className="px-6 py-6 bg-gradient-to-r from-blue-600 to-cyan-600">
      <Sparkles className="w-5 h-5" />
    </Button>
  </div>
</div>
```

**设计要点：**
- 搜索框高度 `py-6`，字号 `text-lg`
- 输入框背景半透明 `bg-slate-800/50`
- 聚焦时边框变蓝 `focus:border-blue-500`
- 按钮使用渐变背景，点击时加深

### 4.3 知识图谱可视化

**节点样式：**
- 未点亮：`fill=#1e293b, stroke=#475569`
- 已点亮：使用分类颜色，带呼吸光晕动画
- 节点大小：半径 25px，光晕半径 35px

**连接线样式：**
- 前置依赖：实线 `#334155`，高亮 `#60a5fa`
- 相关关系：虚线 `stroke-dasharray="5,5"`
- 高亮时透明度 0.8， 普通时 0.2

**图例区域：**
- 位置：左下角 `bottom-4 left-4`
- 背景：`bg-slate-900/80 backdrop-blur-sm rounded-lg`

**统计信息：**
- 位置：右上角 `top-4 right-4`
- 进度条：渐变 `from-blue-500 to-cyan-500`

### 4.4 节点详情面板（Modal）

```tsx
<motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
  <motion.div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl">
    {/* 头部 */}
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase">{category?.name}</span>
          <h2 className="text-3xl font-bold text-slate-100">{node.name}</h2>
          <p className="text-slate-400 mt-2">{node.description}</p>
        </div>
        <Button variant="ghost"><X className="w-5 h-5" /></Button>
      </div>
    </div>
    {/* 内容区 */}
    <div className="p-6 space-y-6">
      {/* 别名 */}
      <div className="flex flex-wrap gap-2">
        {node.aliases.map(alias => (
          <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">{alias}</span>
        ))}
      </div>
      {/* 前置知识/相关概念列表 */}
      {/* 深度探索区域 */}
    </div>
  </motion.div>
</motion.div>
```

**设计要点：**
- 遮罩层 `bg-black/60 backdrop-blur-sm`
- 面板圆角 `rounded-xl`，最大宽度 `max-w-2xl`
- 头部渐变背景，分隔线 `border-slate-700`
- 内容区最大高度 `max-h-[80vh] overflow-y-auto`

### 4.5 历史记录面板

- 仅在有点亮记录时显示
- 列表项：`p-3 bg-slate-800 hover:bg-slate-700 rounded-lg`
- 显示内容：节点名称、匹配术语、时间（相对时间）
- 清空按钮：`variant="ghost"`，悬停变红

### 4.6 匹配反馈组件（Toast）

```tsx
<motion.div className="fixed bottom-8 right-8 z-50">
  <div className={`flex items-center gap-3 px-6 py-4 rounded-lg border backdrop-blur-sm
    ${matched ? 'bg-gradient-to-r from-green-900/90 to-emerald-900/90 border-green-500/50'
                : 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-slate-600/50'
    }`}>
    {matched ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-slate-400" />}
    <div>
      <div className="text-sm font-semibold">{matched ? '匹配成功！' : '未找到匹配'}</div>
      <div className="text-xs">{matched ? `"${term}" → ${nodeName}` : '试试其他术语吧'}</div>
    </div>
  </div>
</motion.div>
```

**设计要点：**
- 位置：右下角 `bottom-8 right-8`
- 动画：3秒后自动消失
- 成功：绿色渐变背景，绿色边框
- 失败：灰色渐变背景

---

## 5. 动画效果

### 5.1 使用的动画库

- **motion/react** - 用于组件动画

### 5.2 典型动画效果

| 效果 | 应用场景 | 实现方式 |
|------|----------|----------|
| 淡入 | 面板出现 | `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` |
| 缩放 | 面板出现 | `initial={{ scale: 0.9, y: 20 }}` |
| 呼吸光晕 | 节点点亮 | `animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}` |
| 弹簧缩放 | 节点悬停 | `transition={{ type: 'spring', stiffness: 300, damping: 20 }}` |
| 进度条 | 统计进度 | `animate={{ width: '60%' }}` |

### 5.3 动画时长

- 短动画：0.2-0.3s（hover、点击反馈）
- 中等动画：0.5-1s（面板展开）
- 长动画：2s（呼吸光晕，循环）

---

## 6. 响应式设计

### 6.1 断点设置

| 断点 | 最小宽度 | 布局变化 |
|------|----------|----------|
| 默认 | - | 单列布局 |
| md | 768px | - |
| lg | 1024px | 双列布局（1:3） |

### 6.2 移动端适配

- 图谱区域 `min-h-[600px]`（移动端降低）
- 侧边栏改为全宽显示
- 搜索框保持全宽

---

## 7. 组件库

Demo 使用了以下 UI 组件（基于 shadcn/ui 设计）：

| 组件 | 用途 |
|------|------|
| Button | 按钮、交互 |
| Input | 搜索输入 |
| Dialog | 详情弹窗（自定义实现） |
| Toast | 通知提示（sonner） |

---

## 8. Vue 重构建议

### 8.1 技术选型

- 状态管理：Pinia（推荐）或 Vuex
- 动画：Vue 的 `<Transition>` + CSS，或使用 Motion One
- 组件库：可使用 Naive UI、Element Plus 或自定义

### 8.2 样式方案

- 推荐：SCSS + CSS Variables（用于主题切换）
- 可选：Tailwind CSS（需要配置 dark mode）

### 8.3 注意事项

1. 深色主题优先，保持科技感
2. 渐变按钮和文字是核心视觉元素
3. 毛玻璃效果 `backdrop-filter: blur()` 很重要
4. 图谱交互逻辑较复杂，建议保留数据结构
5. 动画效果可以简化，但保留核心反馈动画
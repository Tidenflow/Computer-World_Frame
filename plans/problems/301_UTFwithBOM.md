# UTF-8 和 UTF-8 with BOM 的区别

---

## 问题背景

我刚才 json 是 BOM 的时候请求正确但是改成 UTF-8 with BOM 就是一直失败

**解决：** UTF-8 是标准编码，UTF-8 with BOM 是带签名的非标准变体；JSON 规范禁止 BOM，所以你改成带 BOM 后请求失败

---

## 核心区别（一眼看懂）

| 对比项 | 标准 UTF-8（无 BOM） | UTF-8 with BOM（带签名） |
|--------|---------------------|-------------------------|
| 开头字节 | 无额外字节，直接是内容 | 开头固定 3 字节：EF BB BF（BOM） |
| 标准性 | Unicode 官方推荐、通用标准 | 非标准，仅 Windows 常用 |
| 字节序 | UTF-8 无字节序问题，不需要 BOM | BOM 仅作"编码标识"，无实际字节序作用 |
| 兼容性 | 全平台、全协议、全解析器兼容 | 类 Unix、Web、JSON 等场景极易报错 |
| JSON 规范 | 完全符合 RFC 8259 | 明确违反 JSON 规范，严格解析器直接拒绝 |

---

## 为什么 JSON 请求会失败

### 1. JSON 标准不允许 BOM

RFC 8259 规定：JSON 文本必须以 `{`、`[`、字符串、数字、`true/false/null` 开头。
带 BOM 的 JSON 开头是 `EF BB BF`，解析器会把它当成非法字符，直接抛出 `Unexpected token / Invalid JSON` 错误。

### 2. 服务器 / 解析器严格校验

你之前用的可能是宽松解析器（容忍 BOM），改成带 BOM 后遇到严格校验（如 Node.js JSON.parse、PHP json_decode、Nginx / 后端框架），就会直接失败。

### 3. HTTP 响应 / 请求体污染

BOM 是不可见字符，会被当作请求体的一部分发送。服务器收到后，先读到 `EF BB BF`，再读 `{...}`，判定格式非法。

---

## 怎么解决（立即可用）

### 1. 编辑器 / IDE 改成 "UTF-8 无 BOM"

- **VS Code：** 右下角点击编码 → 选择 UTF-8（不是 UTF-8 with BOM）
- **Notepad++：** 编码 → 转为 UTF-8 无 BOM 格式
- **Windows 记事本：** 保存时选 UTF-8（新版已默认无 BOM）

### 2. 代码层面自动处理 BOM（兼容旧文件）

**JavaScript：**
```javascript
// Node.js / 前端：解析前去掉 BOM
function stripBOM(str) {
  return str.replace(/^\uFEFF/, '');
}
const json = JSON.parse(stripBOM(rawText));
```

**Python：**
```python
# Python：用 utf-8-sig 自动处理
import json
with open("data.json", "r", encoding="utf-8-sig") as f:
    data = json.load(f)
```

---

## 最佳实践（避免再踩坑）

- **Web/API/JSON 场景：** 一律用 UTF-8 无 BOM
- **团队统一编码规范：** 所有文本文件（JSON/JS/TS/HTML/CSS）保存为 UTF-8 无 BOM
- **服务器 / 框架配置：** 明确 `Content-Type: application/json; charset=utf-8`，不依赖 BOM 识别编码
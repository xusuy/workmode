# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

WorkMode 是一个浏览器扩展，通过 Alt+W 快捷键在任意网页上覆盖一个类似 WPS 文字的界面。它提取页面的主要段落内容（排除导航/页脚/广告），并在 WPS 风格的 A4 纸张区域中显示，用于在公共场合保护隐私。

**关键设计决策：** 使用元素克隆 + 计算样式保留（而非文本提取）以支持小说网站的特殊字体。番茄小说等网站使用自定义字体映射到 Unicode 私有使用区字符；克隆元素保留 font-family 样式，而文本提取会丢失这些样式。

## 架构

### 两种部署模式

1. **扩展版本** (`dist/`) - 通过 Edge/Chrome 的"加载解压缩的扩展"安装
   - `dist/content.js` - 注入到所有页面的内容脚本
   - `dist/manifest.json` - Manifest V3 配置
   - `dist/wps-style.css` - 单独注入的样式

2. **控制台版本** (`workmode-console.js`) - 粘贴到浏览器控制台运行
   - 自包含（CSS 内联注入）
   - 适合调试无需重新加载扩展
   - 单例模式，重新运行时自动清理

### 内容脚本结构

```
keydown 监听器 (Alt+W) → toggleWorkMode()
    ↓
createOverlay() / removeOverlay()
    ↓
extractTextContent() → 返回 HTMLElement[]（不是字符串！）
    ↓
cloneNode(true) + computedStyle 复制 → #wps-content
```

**重要：** `extractTextContent()` 返回 DOM 元素，而非文本字符串。每个元素通过 `getComputedStyle(el)` 克隆以保留 fontFamily、fontSize、fontWeight、lineHeight、color。

### 内容提取优先级

小说网站优先级最高（需要保留特殊字体）：

```javascript
const novelSelectors = [
  '.muye-reader-content',  // 番茄小说（fanqienovel.com）- 最高优先级
  '.j-chapter-content',
  '.m-reader-text',
  '.chapter-content',
  '.novel-content',
  '.reader-content'
];
```

如果找不到小说容器，回退到通用选择器：
- `article`、`main`、`[role="main"]`
- `.article-content`、`.post-content`、`.entry-content`
- 所有 `<p>` 标签作为最后回退

过滤排除：Cookie 政策、页脚、页眉、导航、侧边栏、广告、法律条款。

### CSS 陷阱：min-height 会覆盖 max-height

**Bug #001：** 内容显示不完整，因为滚动条在小屏幕上超出了视口。

**错误写法：**
```css
#wps-paper {
  min-height: 297mm;  /* ≈1123px，超过笔记本视口 */
  max-height: calc(100vh - 100px);  /* 被忽略！min-height 优先级更高 */
}
```

**正确写法：**
```css
#wps-paper {
  height: 90vh !important;
  overflow-y: scroll !important;
}
```

**规则：** `min-height` + `max-height` 组合对可滚动容器无效。使用固定 `height` 配合 `!important` 和强制滚动条。

### 章节标题提取

小说网站的章节标题通过正则提取：
```javascript
/第(\d+)章\s*([^\n]{1,30}?)(?:\s*本章字数)/
```

显示在 A4 纸内容区域（不要放在工具栏 - 工具栏是固定的 WPS 蓝色条）。

### 平台适配配置

WorkMode 使用 JSON 配置文件适配不同小说平台。

**配置位置:** `dist/platform-configs/*.json`

**配置结构:**
- `domains`: 支持的域名列表
- `content.selector`: 内容容器选择器
- `content.paragraphSelector`: 段落元素选择器
- `content.minParagraphCount`: 最小段落数阈值
- `nextChapter.buttonSelector`: 下一章按钮选择器
- `nextChapter.buttonText`: 下一章按钮文本
- `nextChapter.contentSelector`: 下一章内容容器选择器
- `chapterTitle.regex`: 章节标题提取正则
- `chapterTitle.format`: 章节标题格式模板
- `excludeKeywords`: 排除关键词列表

**添加新平台:**
1. 在 `dist/platform-configs/` 创建新的 JSON 文件
2. 使用浏览器 DevTools 找到内容容器和按钮选择器
3. 更新 `dist/config-loader.js` 的 `configFiles` 数组
4. 重载扩展

**配置示例:**
```json
{
  "domains": ["example.com"],
  "name": "示例平台",
  "content": {
    "selector": ".content-class",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "method": "click",
    "buttonSelector": "button",
    "buttonText": "下一章",
    "contentSelector": ".content-class",
    "loadDelay": 500,
    "verificationDelay": 100
  },
  "chapterTitle": {
    "regex": "第(\\d+)章\\s+(.+)",
    "format": "第{chapter}章 {title}",
    "fallback": "未知章节"
  },
  "excludeKeywords": ["广告", "VIP"]
}
```

### 激活系统

WorkMode 使用本地激活系统控制专业版功能访问。

**激活原理:**
```
激活码 = MD5(用户唯一ID + 固定私钥).substring(0,8).toUpperCase()
```

**文件结构:**
- `dist/activation/activation.js` - 激活逻辑核心
- `dist/activation/md5.js` - MD5 哈希实现
- `dist/activation/activation.css` - 激活弹窗样式
- `tools/activation-generator.html` - 激活码生成器（开发者工具）

**首次使用流程:**
1. 用户首次按 Alt+W → 显示激活弹窗
2. 用户复制自己的用户 ID
3. 联系开发者支付并获取激活码
4. 输入激活码完成激活

**未激活状态:**
- 可以正常浏览当前章节内容
- 点击"下一章"功能时提示激活

## 开发命令

### 安装扩展（Edge/Chrome）
```bash
# 手动浏览器操作：
# 1. 访问 edge://extensions/ 或 chrome://extensions/
# 2. 启用"开发人员模式"
# 3. 点击"加载解压缩的扩展"
# 4. 选择 dist/ 文件夹
```

### 更新 dist 文件夹
```bash
# 修改源文件后，复制到 dist：
cp content.js dist/content.js
cp wps-style.css dist/wps-style.css
cp manifest.json dist/manifest.json
```

### 使用 Playwright 调试（番茄小说测试）
```bash
# 需要：npm install playwright
node test-workmode-extraction.js
```

## 测试网站

- **小说（特殊字体）：** https://fanqienovel.com/reader/7276663560427471412
- **新闻（通用提取）：** 任意新闻网站
- **维基百科：** 内容丰富的文章

## 关键文件参考

| 文件 | 用途 |
|------|---------|
| `dist/content.js` | 生产版内容脚本（元素克隆 + 章节标题） |
| `workmode-console.js` | 控制台调试版本（CSS 内联） |
| `wps-style.css` | 样式（dist 和根目录共用） |
| `dist/manifest.json` | 扩展配置 |
| `docs/bug-log.md` | 已记录 bug 及根因分析 |

## 已知问题

- **快捷键冲突：** 使用捕获阶段（`addEventListener(..., true)`）避免冲突
- **特殊字体：** 必须克隆元素，绝不能只提取 textContent
- **小屏幕：** 始终使用 `height: 90vh`，不要用 `min-height`
- **滚动条可见性：** 强制 `overflow-y: scroll !important`

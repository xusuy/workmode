# Bug 记录

## Bug #001: WorkMode 内容显示不完整

### 问题描述
WorkMode 提取的段落数量正确，但在覆盖层中显示的内容不完整，后面的段落看不到。

### 复现步骤
1. 在番茄小说网站运行 WorkMode
2. 按 Alt+W 激活
3. 查看覆盖层内容，发现最后几段缺失

### 根本原因
CSS 样式冲突：`min-height: 297mm` 覆盖了 `max-height: XXvh`

- `min-height: 297mm` ≈ 1123px
- 在笔记本屏幕上（通常768px或1080px高度），1123px超出了可视范围
- 导致纸张底部超出屏幕，用户看不到滚动条和后面的内容
- 即使设置了 `overflow-y: scroll`，但滚动条也在屏幕外

### 解决方案
```css
#wps-paper {
  height: 90vh !important;  /* 使用固定高度，不要用min-height */
  overflow-y: scroll !important; /* 强制显示滚动条 */
}
```

**关键点：**
1. ❌ 不要使用 `min-height` + `max-height` 的组合，min-height 会覆盖 max-height
2. ✅ 直接使用 `height` 设置固定高度
3. ✅ 使用 `!important` 确保样式优先级
4. ✅ 使用 `overflow-y: scroll` 确保滚动条始终显示

### 经验教训
1. **CSS 优先级问题：** `min-height` 会覆盖 `max-height`，导致高度限制失效
2. **响应式设计：** 在笔记本等小屏幕设备上，需要确保关键UI元素在可视范围内
3. **调试方法：** 检查 `scrollHeight` vs `clientHeight` 来确认是否有溢出内容
4. **用户体验：** 滚动条必须在可视范围内，否则用户无法知道有更多内容

### 测试验证
```javascript
const paper = document.getElementById('wps-paper');
console.log('scrollHeight:', paper.scrollHeight);  // 内容总高度
console.log('clientHeight:', paper.clientHeight);  // 可视区域高度
console.log('滚动条可见:', paper.scrollHeight > paper.clientHeight);
```

### 修复版本
- `workmode-console.js` v1.1
- `dist/content.js` v1.1

### 日期
2026-03-27

---

## Feature #001: Multi-Platform Configuration System

### 功能描述
实现基于 JSON 配置的多平台适配系统，支持不同小说平台无需修改核心代码即可适配。

### 实现内容
1. **配置文件结构：**
   - `dist/platform-configs/fanqienovel.json` - 番茄小说配置
   - `dist/platform-configs/qidian.json` - 起点中文网 配置
   - 每个配置包含域名、内容选择器、下一章按钮、章节标题提取规则等

2. **配置加载器 (`config-loader.js`)：**
   - `loadAllConfigs()` - 加载所有平台配置
   - `registerConfig()` - 注册域名到配置映射
   - `getConfigForPage()` - 根据当前域名获取配置
   - `getFallbackConfig()` - 返回通用网站回退配置

3. **核心代码重构：**
   - `extractTextContent()` - 使用配置驱动的内容选择器
   - `extractChapterTitleFromDoc()` - 使用配置驱动的正则和格式
   - `loadNextChapter()` - 使用配置驱动的按钮和内容选择器
   - `createOverlay()` - 使用配置驱动的按钮检测

4. **Manifest 更新：**
   - 添加 `config-loader.js` 到 content_scripts
   - 添加 `web_accessible_resources` 用于配置文件访问

### 配置结构
```json
{
  "domains": ["example.com"],
  "name": "平台名称",
  "content": {
    "selector": ".content-class",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "supported": true,
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

### 关键设计决策
1. **域名匹配：** 支持精确匹配和子域名匹配（`hostname.endsWith('.' + domain)`）
2. **配置驱动：** 所有平台特定逻辑从核心代码中分离
3. **回退机制：** 未找到配置时使用通用选择器保持兼容性
4. **异步加载：** 使用 `async/await` 加载配置文件
5. **错误容忍：** 单个配置加载失败不影响其他配置

### 添加新平台步骤
1. 在 `dist/platform-configs/` 创建新的 JSON 文件
2. 使用浏览器 DevTools 找到选择器
3. 更新 `config-loader.js` 的 `configFiles` 数组
4. 重载扩展测试

### 测试验证
- [x] 番茄小说 - 内容显示、章节标题、下一章加载
- [ ] 起点中文网 - 内容显示、章节标题、下一章加载
- [ ] 通用网站 - 回退配置正常工作

### 版本
- WorkMode v1.1.0

### 日期
2026-03-28

---

## Bug #002: 起点"下一章"功能失败

### 问题描述
点击起点网站的"加载下一章"按钮后，页面发生跳转而不是在 WorkMode 容器中追加新章节内容。

### 复现步骤
1. 访问起点章节页面：https://www.qidian.com/chapter/1047956575/885879589/
2. 按 Alt+W 激活 WorkMode
3. 点击"加载下一章"按钮
4. 页面导航到下一章，而不是追加内容

### 根本原因
1. **起点使用 Next.js SSR：** fetch 返回的服务端渲染 HTML 结构与客户端渲染后的结构不同
2. **选择器单一：** 原代码只尝试配置文件中的单个选择器（`.content`），如果失败就直接报错
3. **样式处理问题：** `appendChapterContent` 对不在 DOM 中的元素使用 `getComputedStyle()`，返回默认值

### 解决方案

#### 1. 多层选择器回退机制
```javascript
// 首先尝试配置的选择器
let newContent = newDoc.querySelector(contentSelector);

// 失败时尝试备用选择器
const fallbackSelectors = [
  '.content', '.read-content', '#chapter-1',
  '.chapter-content', '.main-content',
  '[class*="content"]', 'main', 'article'
];

// 最后尝试：查找包含最多段落的容器
// 智能遍历所有 div，找段落数最多且文本长度合理的容器
```

#### 2. DOM 检测优化
```javascript
// 检查元素是否在当前 DOM 中
const isInDOM = document.contains(p);

if (isInDOM) {
  // 在 DOM 中：使用 getComputedStyle
  const computedStyle = window.getComputedStyle(p);
  // ...
} else {
  // 不在 DOM 中（fetched）：复制内联样式
  if (p.style.fontFamily) cloned.style.fontFamily = p.style.fontFamily;
  // ...
}
```

#### 3. 配置更新
```json
{
  "nextChapter": {
    "method": "fetch",        // 使用 fetch 而不是 click
    "buttonSelector": "a",    // 起点使用链接不是按钮
    "buttonText": "下一章",
    "contentSelector": ".content"
  }
}
```

### 经验教训
1. **SSR vs CSR：** Next.js 等框架的服务端渲染和客户端渲染的 DOM 结构可能不同
2. **回退策略：** 单一选择器失败时应该有多个备用选择器
3. **DOM 状态检查：** 使用 `getComputedStyle` 前应该检查元素是否在 DOM 中
4. **智能查找：** 当所有选择器失败时，可以通过启发式方法查找内容容器

### 测试验证
```javascript
// 运行诊断脚本：qidian-nextjs-diagnosis.js
// 或在控制台运行：
console.log(window.WorkModeConfigLoader?.getConfig());
```

### 修复版本
- `content.js` v1.2
- `dist/content.js` v1.2
- `dist/platform-configs/qidian.json` v1.1

### 日期
2026-04-01

### 相关文件
- `qidian-nextjs-diagnosis.js` - 起点 Next.js 诊断脚本
- `qidian-fetch-test.js` - Fetch 测试脚本
- `docs/qidian-next-chapter-fix.md` - 修复说明文档

---

## Bug #003: "下一章"连续加载重复内容（状态追踪缺失）

### 问题描述
在起点网站使用 WorkMode 时：
- **第一次**点击"加载下一章"：正确加载下一章内容 ✅
- **第二次及以后**点击"加载下一章"：重复加载相同章节内容 ❌

### 用户描述
> "不管从哪一章节激活WorkMode，下一章的按钮只能加载后面的一个章节内容，后面再点击下一章的话，全都都是追加本章节的内容"

### 复现步骤
1. 访问起点第二章页面
2. 按 Alt+W 激活 WorkMode
3. 点击"加载下一章" → 正确显示第三章内容
4. **再次点击"加载下一章"** → 重复显示第三章内容（应该显示第四章）
5. 继续点击 → 永远重复显示第三章内容

### 根本原因分析

#### 核心问题：状态管理缺失
代码没有追踪"当前在哪一章"，导致每次都从原始页面查找"下一章"链接。

#### 错误的思维模型（我的错误假设）
我一开始假设：
```
用户点击"加载下一章" → 页面导航到下一章 → 从新页面找"下一章"链接
```

但实际的设计是：
```
用户点击"加载下一章" → Fetch 获取下一章内容 → 追加到当前容器 → **页面不跳转**
```

#### 具体代码问题
```javascript
// ❌ 错误代码：每次都用 document（原始页面）找链接
async function loadNextChapter() {
  const nextButton = document.querySelectorAll('a').find(...);  // 永远是第二章的"下一章"链接
  const nextUrl = nextButton.href;  // 永远指向第三章
  fetch(nextUrl)...  // 永远 fetch 第三章内容
}
```

**问题分解：**
1. 浏览器地址栏永远是第二章：`window.location.href` 不变
2. `document` 对象永远是第二章的 DOM
3. `document.querySelectorAll('a')` 永远返回第二章页面的链接
4. 所以找到的"下一章"链接永远指向第三章

#### 为什么第一次"正确"？
第一次点击时：
- 当前页面是第二章
- 从第二章找"下一章"链接 → 指向第三章 ✅
- Fetch 第三章内容并追加

第二次点击时：
- 当前页面还是第二章（因为页面没有跳转）
- 从第二章找"下一章"链接 → 还是指向第三章 ❌
- 再次 Fetch 第三章内容 → 重复！

### 解决方案

#### 核心思路：维护"当前章节"状态
```javascript
// ✅ 正确代码：追踪最后一次 fetch 的章节
const chapterState = {
  loadedChapters: [],
  isLoading: false,
  lastFetchedDoc: null,   // 新增：最后一次 fetch 的 DOM 文档
  lastFetchedUrl: null,   // 新增：最后一次 fetch 的 URL
  lastFetchedHtml: null   // 新增：最后一次 fetch 的 HTML
};

async function loadNextChapter() {
  // 从正确的文档中查找"下一章"链接
  const sourceDoc = chapterState.lastFetchedDoc || document;

  const nextButton = sourceDoc.querySelectorAll('a').find(...);
  const nextUrl = nextButton.href;

  // Fetch 新章节
  const html = await fetch(nextUrl);
  const newDoc = parser.parseFromString(html);

  // 追加内容...

  // 保存状态，供下次使用
  chapterState.lastFetchedDoc = newDoc;
  chapterState.lastFetchedUrl = nextUrl;
  chapterState.lastFetchedHtml = html;
}
```

#### 执行流程
```
第一次点击：
  sourceDoc = document (第二章)
  找到链接：第二章 → 第三章
  Fetch 第三章内容
  保存：lastFetchedDoc = 第三章的文档

第二次点击：
  sourceDoc = lastFetchedDoc (第三章) ✅
  找到链接：第三章 → 第四章
  Fetch 第四章内容
  保存：lastFetchedDoc = 第四章的文档

第三次点击：
  sourceDoc = lastFetchedDoc (第四章) ✅
  找到链接：第四章 → 第五章
  ...
```

### 经验教训

#### 1. 区分"页面导航"和"内容追加"
这是一个经典的**状态同步问题**：
- **传统网页导航**：浏览器地址栏变化，`document` 对象更新
- **SPA/内容追加**：地址栏不变，需要手动维护状态

当我设计"加载下一章"功能时，我潜意识里用了传统网页导航的思维模型，没有意识到 WorkMode 的"内容追加"模式需要手动管理状态。

#### 2. 任何涉及"序列"的功能都需要状态追踪
如果功能涉及：
- 第一章 → 第二章 → 第三章 → ...
- 或者 歌曲列表：上一首/下一首
- 或者 分页：上一页/下一页

**必须维护"当前位置"的状态**，否则无法知道"下一步"去哪里。

#### 3. 测试时不要只测"第一步"
这个 bug 之所以隐藏这么久：
- 我只测试了"第一次点击" ✅
- 没有测试"连续点击多次" ❌

**教训：任何涉及"重复操作"的功能，都要测试至少 3 次循环。**

#### 4. 用户反馈的价值
用户的核心洞察：
> "不管从哪一章节激活，只能加载后面一个章节，后面再点击都是重复"

这句话直接点出了问题的本质：**"只加载一个，后续重复"**。如果我能更早理解这个描述，可能更快定位问题。

#### 5. 诊断脚本的作用
因为起点网站有反调试（debugger），用户无法运行诊断脚本。这大大延长了调试时间。如果：
- 用户能提供控制台日志
- 或者我有一个不需要控制台的诊断方法
- 可能会更快发现问题

### 额外修复

#### 问题1：章节标题显示整篇小说内容
**原因**：`extractChapterTitleFromDoc` 函数从 `h1` 标签提取标题时，如果 `h1` 包含大量文本，会全部显示。

**修复**：
```javascript
// 添加长度检查
if (titleText.length > 50) {
  const chapterMatch = titleText.match(/第\d+章\s+[^\n]{1,30}/);
  if (chapterMatch) {
    titleText = chapterMatch[0];
  } else {
    titleText = titleText.substring(0, 30);
  }
}
```

#### 问题2：状态持久化
当前方案只在单次会话中有效。如果用户刷新页面，`lastFetchedDoc` 会丢失。

**未来改进**：可以考虑使用 `chrome.storage.local` 持久化已加载的章节列表。

### 测试验证

#### 验证步骤
1. 重新加载扩展
2. 访问起点第二章页面
3. 激活 WorkMode (Alt+W)
4. 点击"加载下一章" → 显示第三章 ✅
5. **再次点击"加载下一章"** → 显示第四章 ✅
6. **第三次点击"加载下一章"** → 显示第五章 ✅
7. 继续点击 → 每次都是新章节 ✅

#### 控制台日志验证
```
[WorkMode] 查找链接的来源: 当前页面           // 第一次
[WorkMode] 上次加载的URL: .../第三章ID/      // 第二次
[WorkMode] 查找链接的来源: 上次加载的章节    // 第三次
[WorkMode] 上次加载的URL: .../第四章ID/
```

### 修复版本
- `content.js` v1.3
- `dist/content.js` v1.3

### 日期
2026-04-01

### 难度评级
⭐⭐⭐⭐⭐ (5/5) - 这是一个典型的"状态管理"陷阱，涉及异步操作、DOM 解析、状态追踪等多个概念。

---

## Bug #004: 章节标题提取失败

### 问题描述
- **番茄小说**：显示书名而非章节标题
- **起点第一章**：无法显示章节标题（其他章节正常）

### 用户描述
> "番茄的还是显示书名啊！！起点的除了第一章没有显示正确的标题，其他显示正确！"

### 根本原因分析

#### 问题1：番茄小说标题格式
番茄小说的页面 title 格式为：
```
"我不是戏神第1章 戏鬼回家在线免费阅读_番茄小说官网"
```

书名和章节名直接连接，没有分隔符。原来的正则 `/第\d+章\s+[^\s_]{1,30}/` 无法正确匹配。

#### 问题2：起点第一章 meta 标签
起点使用 Next.js SSR，meta 标签结构可能与客户端渲染不同。原来的 meta 选择器：
```javascript
const metaTitle = doc.querySelector('meta[property="og:title"], meta[name="title"]');
```

可能无法匹配到起点第一章的 meta 标签。

### 解决方案

#### 1. 改进页面 title 提取逻辑
```javascript
const titleElement = doc.querySelector('title');
if (titleElement) {
  const titleText = titleElement.textContent.trim();

  // 起点格式: "第1章 牛顿的感谢 _《书名》小说..."
  const qidianMatch = titleText.match(/^(第\d+章\s+[^_《]+)/);
  if (qidianMatch) {
    return qidianMatch[1].trim();
  }

  // 番茄格式: "书名第1章 章节标题在线阅读..."
  const fanqieMatch = titleText.match(/第\d+章\s+[^在_]{2,20}/);
  if (fanqieMatch) {
    return fanqieMatch[0];
  }
}
```

#### 2. 扩展 meta 标签选择器
```javascript
const metaSelectors = [
  'meta[property="og:title"]',
  'meta[name="title"]',
  'meta[name="keywords"]',          // 新增：番茄可能使用
  'meta[property="chapter:title"]'  // 新增：通用章节标题
];
```

#### 3. 新增日志输出
```javascript
console.log('[WorkMode] 页面 title:', titleText);
console.log('[WorkMode] 检查 meta', selector, ':', metaText);
```

### 测试验证

#### 番茄小说
1. 访问任意番茄小说章节
2. 激活 WorkMode
3. 检查顶部标题显示正确章节名（如"第3章 灾厄"）

#### 起点
1. 访问起点第一章
2. 激活 WorkMode
3. 检查标题显示"第1章 牛顿的感谢"

### 修复版本
- `content.js` v1.4
- `dist/content.js` v1.4

### 日期
2026-04-01

### 相关文件
- `find-fanqie-title.js` - 番茄标题诊断脚本

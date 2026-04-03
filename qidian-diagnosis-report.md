# 起点网站"下一章"功能问题诊断报告

## 问题概述
起点网页小说点击"下一章"无法实现和番茄网页小说同样的功能。

## 配置对比

### 番茄小说 (正常工作)
```json
{
  "buttonSelector": "button",
  "buttonText": "下一章",
  "contentSelector": ".muye-reader-content"
}
```

### 起点 (存在问题)
```json
{
  "buttonSelector": "a[href*='/chapter/'][href$='/']",
  "buttonText": "下一章",
  "contentSelector": "main"
}
```

## 问题根因分析

### 1. 选择器不匹配
**问题**：`a[href*='/chapter/'][href$='/']` 这个选择器可能：
- 同时匹配"上一章"和"下一章"两个链接
- 匹配的元素文本可能不包含"下一章"

**代码逻辑**（content.js 第 375-377 行）：
```javascript
const nextButton = Array.from(document.querySelectorAll(buttonSelector)).find(btn =>
  btn.textContent.includes(buttonText)
);
```

这个逻辑会找到所有匹配 `a[href*='/chapter/'][href$='/']` 的元素，然后筛选出 `textContent` 包含"下一章"的那个。

**起点网站可能的 DOM 结构**：
```html
<!-- 可能的实际结构 -->
<div class="chapter-control">
  <a href="/chapter/xxx/prev/">上一章</a>
  <a href="/chapter/xxx/next/">下一章</a>
</div>
```

但如果"下一章"链接使用了图标或符号，`textContent` 可能就不包含"下一章"了。

### 2. 内容检测问题
**问题**：`contentSelector: "main"` 太宽泛

点击"下一章"后，代码通过比较 `main` 元素的 `textContent` 来判断内容是否变化（第 397-401 行）：

```javascript
const newContent = document.querySelector(contentSelector);
const newText = newContent?.textContent || '';

if (newText === currentText) {
  throw new Error('内容未变化，可能已到最后一章');
}
```

如果 `main` 元素包含了导航栏、侧边栏等不变的元素，`textContent` 可能变化不明显，导致误判。

### 3. 按钮检测逻辑问题
在 `createOverlay()` 函数中（第 145-147 行），检查是否显示"加载下一章"按钮的逻辑：

```javascript
const hasNextChapter = Array.from(document.querySelectorAll(buttonSelector)).some(btn =>
  btn.textContent.includes(buttonText)
);
```

如果起点的"下一章"不是纯文本（而是图标或符号），这个检查就会失败。

## 解决方案

### 方案 1: 调试起点网站 DOM 结构
1. 在起点小说章节页面打开浏览器控制台
2. 运行 `debug-qidian-dom.js` 脚本
3. 根据输出结果确定正确的选择器

### 方案 2: 修改起点配置
根据调试结果，可能需要：
- 更精确的选择器（如特定的类名或数据属性）
- 更精确的内容选择器（如特定的容器类名）
- 调整按钮文本匹配逻辑

### 方案 3: 增强代码逻辑
修改 `content.js` 以支持：
- 更灵活的按钮检测（支持 aria-label、title 等属性）
- 更精确的内容变化检测（使用容器内特定元素而非整个容器）
- 对不同链接的智能识别（通过 href 模式区分"上一章"和"下一章"）

## 下一步
请运行 `debug-qidian-dom.js` 并分享输出结果，以便进一步诊断。

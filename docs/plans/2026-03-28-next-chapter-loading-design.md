# 下一章加载功能设计

**日期：** 2026-03-28
**类型：** 功能增强
**状态：** 已确认

## 概述

在 WorkMode 中添加"下一章"检测和加载功能，允许用户在阅读小说时连续加载多章内容，无需离开 WorkMode 界面。

## 核心设计

### 功能模式
- **触发方式：** 手动触发（底部按钮）
- **呈现方式：** 追加内容到当前界面，显示章节标题分隔
- **错误处理：** 显示提示信息（"已到最后一章"/"加载失败"）

### 架构组件

| 组件 | 职责 |
|------|------|
| NextChapterDetector | 检测当前页面是否有"下一章"链接 |
| NextChapterLoader | 获取并解析下一章内容 |
| LoadButtonUI | 底部加载按钮的显示/隐藏逻辑 |

## 数据流

```
用户激活 WorkMode
  ↓
NextChapterDetector 检测"下一章"链接
  ↓
如果存在，在底部显示"加载下一章"按钮
  ↓
用户点击按钮
  ↓
NextChapterLoader 获取链接 HTML
  ↓
复用现有 extractTextContent() 提取内容
  ↓
追加章节标题 + 内容到 #wps-content
  ↓
更新状态栏字数统计
  ↓
检测是否还有下一章，更新按钮状态
```

## 小说网站"下一章"链接选择器

```javascript
const nextChapterSelectors = [
  '.muye-reader-footer .reader-footer-button',  // 番茄小说（优先）
  'a[href*="chapter"]',  // 通用小说链接
  '.next-chapter',
  '#next-chapter'
];
```

## 组件详细设计

### NextChapterDetector

```javascript
function detectNextChapter() {
  const selectors = [
    '.muye-reader-footer .reader-footer-button',
    'a[href*="chapter"]',
    '.next-chapter'
  ];

  for (const selector of selectors) {
    const link = document.querySelector(selector);
    if (link && isValidNextLink(link)) {
      return {
        url: link.href,
        title: link.textContent.trim()
      };
    }
  }
  return null;
}

function isValidNextLink(link) {
  const text = link.textContent.toLowerCase();
  return text.includes('下一章') || text.includes('下一页');
}
```

### NextChapterLoader

```javascript
async function loadNextChapter(nextUrl) {
  if (chapterState.isLoading) return;
  if (chapterState.loadedChapters.includes(nextUrl)) {
    showMessage('该章节已加载');
    return;
  }

  chapterState.isLoading = true;
  updateButtonState('loading');

  try {
    // 1. 获取下一章 HTML
    const response = await fetch(nextUrl);
    const html = await response.text();

    // 2. 解析 DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 3. 提取章节标题
    const chapterTitle = extractChapterTitle(doc);

    // 4. 复用现有逻辑提取段落
    const paragraphs = extractParagraphsFromDoc(doc);

    // 5. 追加到界面
    appendChapterContent(chapterTitle, paragraphs);

    // 6. 更新状态
    chapterState.loadedChapters.push(nextUrl);
    updateWordCount();

    // 7. 检测是否还有下一章
    const hasNext = detectNextChapterInDoc(doc);
    updateButtonState(hasNext ? 'available' : 'finished');

  } catch (error) {
    showMessage('加载失败：' + error.message);
    updateButtonState('error');
  }

  chapterState.isLoading = false;
}
```

### 状态管理

```javascript
const chapterState = {
  currentUrl: window.location.href,
  loadedChapters: [window.location.href],
  hasNextChapter: false,
  isLoading: false
};
```

## UI 设计

### 加载按钮样式

```css
#wps-load-next-btn {
  display: block;
  width: 200px;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #2B579A;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

#wps-load-next-btn:hover {
  background-color: #3B6AB5;
}

#wps-load-next-btn.loading {
  opacity: 0.6;
  cursor: wait;
}
```

### 章节分隔样式

```css
.chapter-separator {
  margin-top: 40px;
  margin-bottom: 20px;
}

.chapter-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.chapter-divider {
  height: 1px;
  background-color: #ddd;
  margin: 10px auto;
  width: 80%;
}
```

### 章节追加逻辑

```javascript
function appendChapterContent(title, paragraphs) {
  const content = document.getElementById('wps-content');

  // 添加章节分隔
  const separator = document.createElement('div');
  separator.className = 'chapter-separator';
  separator.innerHTML = `
    <div class="chapter-title">${title}</div>
    <div class="chapter-divider"></div>
  `;
  content.appendChild(separator);

  // 追加段落
  paragraphs.forEach(p => {
    content.appendChild(p.cloneNode(true));
  });

  // 自动滚动到新内容
  separator.scrollIntoView({ behavior: 'smooth' });
}
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 网络请求失败 | 显示"加载失败，请检查网络连接"，保持按钮可见 |
| 解析失败 | 显示"无法解析章节内容"，隐藏按钮 |
| 已到最后一章 | 显示"已到最后一章"，隐藏按钮 |
| 重复加载 | 静默忽略，显示"该章节已加载" |
| 跨域限制 | 尝试 fetch 失败时提示"跨域加载受限" |

## 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `content.js` | 添加三个新函数和状态管理 |
| `dist/content.js` | 同步更新 |
| `wps-style.css` | 添加按钮和章节分隔样式 |
| `dist/wps-style.css` | 同步更新 |

## 测试计划

### 测试网站
- 番茄小说：https://fanqienovel.com/reader/7276663560427471412

### 测试用例
1. **正常流程**
   - 激活 WorkMode → 验证按钮显示
   - 点击加载 → 验证内容正确追加
   - 验证章节标题正确显示
   - 验证字数统计更新

2. **边界情况**
   - 加载最后一章 → 验证按钮隐藏
   - 重复点击同一章 → 验证提示信息
   - 断网情况下点击 → 验证错误提示

3. **兼容性**
   - 测试不同小说网站
   - 测试不同章节长度

## 优势

- ✅ 代码改动最小，复用现有提取逻辑
- ✅ 不影响现有功能
- ✅ 符合 WPS 伪装场景
- ✅ 手动触发，用户可控
- ✅ 防止重复加载

## 限制

- ⚠️ 跨章节加载可能遇到 CORS 限制
- ⚠️ 不同小说网站结构差异较大
- ⚠️ 需要维护选择器列表

## 实现优先级

1. **P0** - 核心加载功能（番茄小说支持）
2. **P1** - 错误处理和用户提示
3. **P2** - 扩展更多小说网站支持

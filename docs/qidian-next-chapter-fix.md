# 起点"下一章"功能修复说明

## 修复内容

### 1. 问题诊断
- 起点使用 Next.js SSR，fetched HTML 的 DOM 结构可能与客户端不同
- 原代码只尝试一个选择器，如果失败就直接报错
- `appendChapterContent` 对不在 DOM 中的元素使用了 `getComputedStyle`

### 2. 代码更新

#### content.js `loadNextChapter` 函数
添加了多层回退机制：
1. 首先尝试配置文件中的选择器 (`.content`)
2. 如果失败，尝试多个备用选择器：
   - `.content`
   - `.read-content`
   - `#chapter-1`
   - `.chapter-content`
   - `.main-content`
   - `[class*="content"]`
   - `main`
   - `article`
3. 如果都失败，查找包含最多段落的容器

#### content.js `appendChapterContent` 函数
修复了样式处理逻辑：
- 检查元素是否在当前 DOM 中
- 在 DOM 中的元素：使用 `getComputedStyle`
- 不在 DOM 中的元素（fetched）：复制内联样式

### 3. 测试步骤

1. **重新加载扩展**
   - 打开 `edge://extensions/`
   - 找到 WorkMode 扩展
   - 点击"重新加载"按钮

2. **访问起点测试页面**
   ```
   https://www.qidian.com/chapter/1047956575/885879589/
   ```

3. **激活 WorkMode**
   - 按 `Alt+W`

4. **测试"下一章"**
   - 点击底部工具栏的"加载下一章"按钮
   - 观察控制台输出（F12 打开控制台）

5. **预期结果**
   - 控制台显示：`[WorkMode] 使用 MPA fetch 模式`
   - 控制台显示：`[WorkMode] 提取到 X 个段落`
   - 新章节内容追加到 WorkMode 容器中
   - 页面不发生跳转

### 4. 如果仍有问题

#### 诊断方法 1: 使用诊断脚本
复制以下代码到起点页面控制台运行：

```javascript
// 文件: qidian-nextjs-diagnosis.js
// （在项目根目录下，可以复制粘贴到控制台）
```

#### 诊断方法 2: 检查配置加载
在控制台运行：
```javascript
console.log(window.WorkModeConfigLoader?.getConfig());
```

应该输出起点配置对象。

#### 诊断方法 3: 手动测试 fetch
在控制台运行：
```javascript
// 查找下一章链接
const nextLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent === '下一章');
console.log('下一章 URL:', nextLink.href);

// 测试 fetch
fetch(nextLink.href)
  .then(r => r.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.content');
    console.log('找到内容:', content);
    console.log('段落数:', content?.querySelectorAll('p').length);
  });
```

### 5. 配置文件

起点配置文件位置：`dist/platform-configs/qidian.json`

```json
{
  "domains": ["qidian.com", "m.qidian.com", "www.qidian.com"],
  "name": "起点中文网",
  "content": {
    "selector": ".content",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "supported": true,
    "method": "fetch",
    "buttonSelector": "a",
    "buttonText": "下一章",
    "contentSelector": ".content",
    "loadDelay": 1000,
    "verificationDelay": 200
  }
}
```

## 常见问题

**Q: 点击后页面跳转了**
A: 说明配置没有正确加载。检查控制台是否有 `[WorkMode] Using config: 起点中文网` 的日志。

**Q: 提示"找不到内容选择器"**
A: 运行 `qidian-nextjs-diagnosis.js` 诊断脚本，查看实际 DOM 结构。

**Q: 内容追加但样式不对**
A: 这是正常的，fetched 的内容无法获取完整的计算样式。

**Q: 最后一章后还能点击**
A: 代码会检测是否还有下一章，如果没有会禁用按钮。

## 更新日志

- 2026-04-01: 初始修复，添加多层选择器回退和 DOM 检测

# 起点"下一章"功能完整修复记录

## 修复时间
2026-04-01

## 问题描述
用户在起点网站使用 WorkMode 时，连续点击"加载下一章"按钮，只有第一次能正确加载下一章，后续点击都会重复加载相同章节。

## 完整问题链

### 第一层问题：内容选择器错误
**表现**：点击后显示"找不到内容选择器"
**原因**：使用了错误的选择器 `.read-content`，起点实际使用 `.content`
**修复**：更新 qidian.json 配置文件

### 第二层问题：标题显示整篇小说
**表现**：章节标题位置显示了整篇小说内容
**原因**：`extractChapterTitleFromDoc` 函数从 h1 提取时没有长度限制
**修复**：添加标题长度截断（最多 100 字符）

### 第三层问题：重复加载相同章节（核心）
**表现**：第二次及以后点击都加载相同章节
**原因**：**状态管理缺失** - 每次都从原始页面找"下一章"链接
**修复**：添加 `lastFetchedDoc` 追踪最后一次加载的章节

## 核心代码变更

### 状态管理
```javascript
// 新增状态字段
const chapterState = {
  loadedChapters: [],
  isLoading: false,
  lastFetchedDoc: null,   // 🔑 关键：追踪最新章节的 DOM
  lastFetchedUrl: null,
  lastFetchedHtml: null
};
```

### 链接查找逻辑
```javascript
// ✅ 修复后：从正确的文档查找链接
const sourceDoc = chapterState.lastFetchedDoc || document;
const nextButton = sourceDoc.querySelectorAll(buttonSelector).find(...);
```

### 状态保存
```javascript
// Fetch 成功后保存新章节信息
chapterState.lastFetchedDoc = newDoc;
chapterState.lastFetchedUrl = nextUrl;
chapterState.lastFetchedHtml = html;
```

## 关键洞察

### 1. 思维模型的陷阱
我错误地假设页面会导航，但实际上：
- **传统网页**：点击链接 → 浏览器导航 → 地址栏和 document 更新
- **WorkMode**：点击按钮 → Fetch 内容 → 追加到容器 → **页面不变**

### 2. 状态同步的必要性
任何涉及"序列"的功能（上一章/下一章、上一首/下一首）都需要：
- 维护"当前位置"状态
- 每次操作后更新状态
- 下次操作时使用最新状态

### 3. 测试的完整性
**教训**：测试涉及重复操作的功能时，至少测试 3 次循环
- 第一次：正常流程 ✅
- 第二次：边界条件 ❌（隐藏 bug）
- 第三次：状态一致性 ❌（隐藏 bug）

## 用户贡献

### 关键反馈
> "不管从哪一章节激活WorkMode，下一章的按钮只能加载后面的一个章节内容，后面在点击下一章的话，全都都是追加本章节的内容"

这句话直接指出了问题的本质：**"只加载一个，后续重复"**。

### 测试配合
- 用户提供了准确的章节标题（牛顿的感觉 / 这就是学霸眼中的世界吗 / 焦耳的学习方法）
- 用户多次验证修复结果，确认问题解决

## 修复验证

### 测试场景
| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 第一次点击"下一章" | ✅ 加载第三章 | ✅ 加载第三章 |
| 第二次点击"下一章" | ❌ 重复第三章 | ✅ 加载第四章 |
| 第三次点击"下一章" | ❌ 重复第三章 | ✅ 加载第五章 |
| 连续点击 10 次 | ❌ 一直重复第三章 | ✅ 连续加载新章节 |

### 控制台日志验证
```
[WorkMode] 查找链接的来源: 当前页面            // 第一次：从第二章找
[WorkMode] 下一章 URL: .../第三章ID/
[WorkMode] 已保存章节信息用于下次查找链接

[WorkMode] 查找链接的来源: 上次加载的章节      // 第二次：从第三章找
[WorkMode] 上次加载的URL: .../第三章ID/
[WorkMode] 下一章 URL: .../第四章ID/
```

## 相关文件
- `content.js` - 核心修复
- `dist/content.js` - 生产版本
- `docs/bug-log.md` - 详细 bug 记录
- `dist/platform-configs/qidian.json` - 起点配置

## 版本历史
- v1.0: 初始版本（只有"下一章"按钮）
- v1.1: 添加番茄小说支持（SPA click 模式）
- v1.2: 添加起点支持（MPA fetch 模式）- 但有 bug
- v1.3: **修复状态追踪 bug** - 完全可用 ✅

## 未来改进方向

### 1. 状态持久化
当前状态在刷新页面后丢失，可以考虑：
```javascript
// 使用 chrome.storage.local 持久化
chrome.storage.local.set({
  loadedChapters: [...],
  lastChapterUrl: ...
});
```

### 2. 跳转功能
添加章节列表，允许用户跳转到任意章节：
```javascript
function jumpToChapter(chapterIndex) {
  // 直接 fetch 指定章节
}
```

### 3. 阅读进度保存
记住用户读到哪一章，下次打开时自动跳转。

---

## 总结

这个 bug 的修复经历让我深刻认识到：

1. **状态管理是异步操作的核心** - 任何涉及"序列"的功能都需要维护"当前位置"
2. **思维模型很重要** - 不要假设传统网页的行为，要理解实际的设计模式
3. **测试要全面** - 重复操作至少测试 3 次
4. **用户反馈是金矿** - 准确的问题描述能大大缩短调试时间

感谢用户的耐心配合和清晰反馈！🎉

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

# 起点"下一章"问题快速测试指南

## 步骤1：重新加载扩展
1. 打开 `edge://extensions/`
2. 找到 WorkMode
3. 点击刷新按钮 🔄

## 步骤2：打开控制台（绕过 debugger）

### 方法A：断点禁用（推荐）
1. 先打开 F12
2. 在 Console 标签页，点击右上角的 ⚙️ 设置
3. 找到 "Disable breakpoints" 或类似选项，启用
4. 或者按 `Ctrl+Shift+F`，搜索 "debugger"，找到后右键选择 "Never pause here"

### 方法B：快速切换法
1. 先访问起点页面
2. 快速按 F12
3. 立即点击 Console 标签（不要让它在 Sources 标签停留）
4. 如果触发了断点，点继续执行按钮 ▶️

### 方法C：事后查看法
1. 先关闭开发者工具
2. 在起点页面激活 WorkMode（Alt+W）
3. 点击"加载下一章"
4. 然后快速按 F12 打开控制台
5. 查看已有的日志

## 步骤3：测试并查看日志

### 在第二章页面：
```
https://www.qidian.com/chapter/1047956575/885879589/
```

### 激活 WorkMode
按 `Alt+W`

### 点击"加载下一章"按钮

### 查看控制台输出（重要！）
应该看到类似这样的日志：

```
[WorkMode] 开始加载下一章...
[WorkMode] 使用 MPA fetch 模式
[WorkMode] 当前页面: https://www.qidian.com/chapter/...
[WorkMode] 下一章 URL: https://www.qidian.com/chapter/...
[WorkMode] URL 是否相同: false  <-- 这里应该是 false
[WorkMode] HTML 解析成功，长度: XXXXX
[WorkMode] 最终提取到 XX 个段落
[WorkMode] 新章节内容预览:
  段[0]: 【某某】：某某某...
  段[1]: ...
  段[2]: ...
[WorkMode] 提取的章节标题: 第X章 xxxx
[WorkMode] 标题长度: XX
```

## 步骤4：告诉我你看到了什么

**请告诉我以下信息：**

1. **"URL 是否相同"显示什么？**
   - true 还是 false？

2. **"提取的章节标题"显示什么？**
   - 是否是正确的第三章标题"焦耳的学习方法"？
   - 还是显示了超长内容？

3. **"新章节内容预览"显示了什么？**
   - 是第三章的开头内容？
   - 还是第二章的重复内容？

4. **有没有错误信息？**
   - 红色的错误

告诉我这些，我就能精准修复！

---

## 备用：手动检查"下一章"链接

如果控制台实在打不开，手动检查：

1. 在第二章页面
2. 找到页面上的"下一章"按钮/链接
3. 右键点击 → "复制链接地址"
4. 把链接发给我

链接应该类似：
```
https://www.qidian.com/chapter/1047956575/下一章的ID/
```

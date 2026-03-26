# WorkMode - 设计文档

**日期：** 2026-03-26
**类型：** 隐私保护/伪装模式浏览器扩展

## 概述

WorkMode 是一个 Edge 浏览器扩展，通过快捷键在当前网页上覆盖一个高度模仿 WPS 文字编辑界面的全屏层，让用户在公共场合工作时看起来像是在用 WPS 写文档。

## 核心功能

1. **快捷键切换：** Ctrl+Shift+W 打开/关闭伪装模式
2. **文本提取：** 从当前页面提取主要段落文本
3. **WPS 界面：** 基本相似的 WPS Writer 编辑界面
4. **全屏覆盖：** 不可点击穿透的覆盖层

## 架构设计

### 组件结构

| 文件 | 职责 |
|------|------|
| `manifest.json` | Manifest V3 配置文件，声明扩展信息 |
| `content.js` | 核心 content script，处理快捷键、文本提取、DOM 操作 |
| `wps-style.css` | WPS 界面样式定义 |

### 核心流程

```
用户按 Ctrl+Shift+W
    ↓
content.js 监听到事件
    ↓
提取当前页面段落文本
    ↓
创建全屏覆盖层 DOM
    ↓
注入文本到 A4 纸区域
    ↓
用户再次按 Ctrl+Shift+W
    ↓
移除覆盖层，恢复原页面
```

## 界面设计

### 顶栏
- **背景色：** `#2B579A`（WPS 蓝）
- **高度：** 48px
- **Logo：** 左侧显示
- **菜单项：** 文件、开始、插入、布局、引用、视图

### A4 纸区域
- **比例：** 210mm × 297mm
- **背景：** 纯白 `#FFFFFF`
- **阴影：** 轻微阴影与灰色背景区分
- **居中：** 水平居中，上下留白 60px
- **内边距：** 40px

### 文本样式
- **字体：** 微软雅黑 "Microsoft YaHei"
- **大小：** 16px
- **行高：** 1.5（24px）
- **颜色：** #333333
- **段落间距：** 0.5em

### 全屏覆盖层
- **定位：** `position: fixed`
- **z-index：** 2147483647（最大值）
- **背景色：** #F5F5F5（浅灰）
- **交互：** `pointer-events: all` 阻止点击穿透

## 文本提取逻辑

```javascript
const extractText = () => {
  const paragraphs = document.querySelectorAll('p, article p, div p, .content p');
  const texts = Array.from(paragraphs)
    .map(p => p.textContent.trim())
    .filter(text => text.length > 10);
  return texts;
};
```

### 提取优先级
1. `<article>` 标签内的段落
2. 带有内容类名的区域（`.content`, `.post`, `.article`）
3. 所有 `<p>` 标签

### 边界处理
- 无段落内容 → 显示"无法提取内容"提示
- 内容少于3个段落 → 显示提示
- 过滤导航菜单、页眉页脚中的短文本

## 快捷键处理

```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
    e.preventDefault();
    toggleWorkMode();
  }
});
```

### 状态管理
- `isActive` 布尔值跟踪覆盖层状态
- 每次切换重新提取文本

### 切换逻辑
- 关闭 → 打开：提取文本 → 创建覆盖层 → `isActive = true`
- 打开 → 关闭：移除覆盖层 → `isActive = false`

## 文件结构

```
workmode/
├── manifest.json
├── content.js
├── wps-style.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Manifest 配置

- **格式：** Manifest V3
- **名称：** WorkMode
- **版本：** 1.0.0
- **注入范围：** `<all_urls>`
- **权限：** 无需特殊权限

## 实现优先级

1. **P0 - 核心功能：** 快捷键监听、覆盖层切换
2. **P0 - 界面渲染：** WPS 顶栏、A4 纸区域
3. **P1 - 文本提取：** 段落提取逻辑
4. **P2 - 优化：** 更好的提取算法、样式细节

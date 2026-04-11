# WorkMode 激活系统设计文档

**日期:** 2026-04-10
**状态:** 已确认

---

## 一、概述

实现本地激活系统，用户支付后获取激活码解锁专业版功能（翻页等）。

**核心原理:**
```
激活码 = MD5(用户唯一ID + 固定私钥).substring(0,8).toUpperCase()
```

---

## 二、文件结构

```
dist/
├── activation/
│   ├── activation.js          # 激活逻辑核心模块
│   ├── md5.js                 # 精简 MD5 实现
│   └── activation.css         # 激活弹窗样式
├── manifest.json (更新)

项目根目录/
├── tools/
│   └── activation-generator.html   # 激活码生成器（开发者工具）
└── docs/plans/
    └── 2026-04-10-activation-system-design.md
```

---

## 三、核心组件

### 3.1 activation.js - 激活逻辑模块

**接口:**
```javascript
const WorkModeActivation = {
  async getUserId(): Promise<string>      // 获取/生成用户唯一ID
  async isActivated(): Promise<boolean>   // 检查是否已激活
  async verifyActivation(code: string): Promise<boolean}  // 验证激活码
  showActivationDialog(): void            // 显示激活弹窗
  copyUserId(): void                      // 复制userId到剪贴板
}
```

**SECRET_SALT:** 硬编码在文件顶部，使用混淆变量名

### 3.2 md5.js - MD5 实现

- 手写精简实现，< 3KB
- 零外部依赖
- 返回 32 位十六进制字符串

### 3.3 activation.css - 样式

包含激活弹窗、提示框的完整样式

---

## 四、存储结构 (chrome.storage.local)

```javascript
{
  userId: "a1b2c3d4e5f6",           // 用户唯一ID
  isActivated: false,              // 激活状态
  activationCode: "E9F2B1C0",      // 已激活的激活码
  firstLaunchShown: false          // 是否已显示过首次激活弹窗
}
```

**用户ID生成:**
```javascript
Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
// 示例: "lx1a2b3c4d5e6f7"
```

---

## 五、激活流程

```
首次按 Alt+W
    ↓
显示激活弹窗（一次性提示）
    ↓
用户选择：
├─ 输入激活码 → 激活成功 → 全功能可用
└─ 关闭弹窗 → WorkMode 正常启动，但"下一章"功能受限

未激活状态下点击"下一章":
    ↓
显示激活弹窗
    ↓
用户可选择：激活 或 取消
```

---

## 六、UI 设计

### 6.1 激活弹窗

```
┌─────────────────────────────────┐
│     欢迎使用 WorkMode           │
│                                 │
│  解锁专业版：                   │
│  支持翻页和更多功能              │
│  及开发者持续更新维护。          │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 您的用户 ID:            │   │
│  │ ┌─────────────────────┐ │   │
│  │ │ a1b2c3d4e5f6    [📋]│ │   │
│  │ └─────────────────────┘ │   │
│  │ 支付时请将此 ID 发给开发者 │   │
│  └─────────────────────────┘   │
│                                 │
│  激活码: ┌──────────────┐      │
│         └──────────────┘      │
│                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │
│                                 │
│  🟢 加绿泡泡 jycc1024666        │
│     发送 ID 即可获取永久激活码   │
│  💰 19.9 元 / 永久              │
│  ⏰ 人工发码，在线时间 9:00-23:00│
│                                 │
│         ┌──────┐  ┌──────┐    │
│         │ 取消 │  │ 激活 │    │
│         └──────┘  └──────┘    │
└─────────────────────────────────┘
```

### 6.2 工具栏 User ID 显示

```
[WPS] [文件] [开始] ... [兼容模式] 文档1.docx    [ID: a1b2c3... □]
                                                              ↑ 点击复制
```

- 显示前 8 位
- 点击复制完整 ID
- 显示 2 秒"已复制"提示

---

## 七、开发者工具

**tools/activation-generator.html**

输入用户 ID → 点击生成 → 显示激活码 → 复制

---

## 八、manifest.json 更新

```json
{
  "version": "1.2.0",
  "permissions": ["storage"],
  "content_scripts": [{
    "js": [
      "config-loader.js",
      "activation/md5.js",
      "activation/activation.js",
      "content.js"
    ],
    "css": ["wps-style.css", "activation/activation.css"]
  }]
}
```

---

## 九、content.js 集成点

1. **文件顶部引入:** activation.js
2. **toggleWorkMode():** 开始处检查激活状态
3. **createOverlay():** 添加 userId 显示元素
4. **下一章按钮点击:** 检查激活状态，未激活显示弹窗

---

## 十、两种弹窗场景

| 场景 | 标题 | 取消后行为 |
|------|------|-----------|
| 首次使用 | "欢迎使用 WorkMode" | 正常启动 WorkMode |
| 功能触发 | "该功能需要激活" | 关闭弹窗，停留在当前章节 |

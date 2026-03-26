# WorkMode

在公共场合伪装成 WPS 工作的浏览器扩展。

## 功能

- 按 Ctrl+Shift+W 打开/关闭伪装模式
- 自动提取当前页面的段落文本
- 显示 WPS 风格的编辑界面

## 安装方法

### Edge 浏览器

1. 打开 Edge 浏览器
2. 访问 `edge://extensions/`
3. 启用"开发人员模式"
4. 点击"加载解压缩的扩展"
5. 选择本项目文件夹

## 使用方法

1. 浏览任意网页
2. 按 Ctrl+Shift+W 进入 WorkMode
3. 再次按 Ctrl+Shift+W 退出

## 测试

建议在以下网站测试：
- 新闻网站（文章内容丰富）
- 博客文章
- Wikipedia 条目

## 开发

```
manifest.json      - 扩展配置
content.js         - 核心逻辑
wps-style.css      - WPS 界面样式
```

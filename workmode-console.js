// ============================================================================
// WorkMode - 浏览器控制台版本
// 直接在浏览器控制台粘贴运行即可
// 快捷键：Alt+W
// ============================================================================

(function() {
  'use strict';

  console.log('[WorkMode] 正在初始化...');

  // ============================================================
  // 注入 CSS 样式
  // ============================================================
  const styleId = 'workmode-styles';

  // 先移除所有旧的WorkMode样式
  const oldStyles = document.querySelectorAll('#workmode-styles');
  oldStyles.forEach(s => s.remove());

  // 移除所有旧的WorkMode元素
  const oldOverlay = document.getElementById('wps-overlay');
  if (oldOverlay) oldOverlay.remove();

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* WorkMode Overlay Styles */

    /* Full screen overlay container */
    #wps-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #F5F5F5;
      z-index: 2147483647;
      display: none;
      font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
    }

    /* Top toolbar - WPS blue */
    #wps-toolbar {
      background-color: #2B579A;
      height: 48px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* WPS Logo area */
    #wps-logo {
      font-size: 20px;
      font-weight: bold;
      color: white;
      margin-right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Menu items */
    #wps-menu {
      display: flex;
      gap: 4px;
    }

    .wps-menu-item {
      color: white;
      padding: 8px 16px;
      font-size: 14px;
      cursor: default;
      border-radius: 2px;
      transition: background-color 0.15s;
    }

    .wps-menu-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    /* 文档标题 */
    #wps-doc-title {
      color: white;
      font-size: 14px;
      margin-left: auto;
      margin-right: 16px;
      opacity: 0.9;
    }

    /* A4 paper container */
    #wps-paper {
      width: 210mm;
      height: calc(90vh - 28px) !important; /* 减去状态栏高度 */
      background-color: #FFFFFF;
      margin: 30px auto;
      margin-bottom: 58px; /* 额外底部边距避开状态栏 */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 40px;
      box-sizing: border-box;
      overflow-y: scroll !important; /* 强制显示滚动条 */
      -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
    }

    /* Paper content styling */
    #wps-content {
      font-size: 16px;
      line-height: 1.5;
      color: #333333;
    }

    #wps-content p {
      margin: 0 0 0.5em 0;
      text-align: justify;
    }

    /* 确保滚动条样式 */
    #wps-paper::-webkit-scrollbar {
      width: 12px;
    }

    #wps-paper::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    #wps-paper::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 6px;
    }

    #wps-paper::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* Empty state message */
    #wps-empty {
      text-align: center;
      color: #999999;
      padding: 60px 20px;
      font-size: 14px;
    }

    /* 底部状态栏 */
    #wps-statusbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 28px;
      background-color: #2B579A;
      display: flex;
      align-items: center;
      padding: 0 16px;
      font-size: 12px;
      color: white;
      z-index: 2147483648;
    }

    #wps-statusbar .status-item {
      margin: 0 8px;
    }

    #wps-statusbar .status-divider {
      margin: 0 4px;
      opacity: 0.5;
    }

    /* Active state - show overlay */
    #wps-overlay.active {
      display: block;
    }
  `;
  document.head.appendChild(style);

  // ============================================================
  // WorkMode 核心逻辑
  // ============================================================

  // 移除旧实例（如果存在）
  if (window.workmodeInstance) {
    window.workmodeInstance.cleanup();
  }

  const WorkMode = {
    isActive: false,
    overlay: null,

    // 初始化
    init: function() {
      console.log('[WorkMode] 已初始化，按 Alt+W 激活');
      this.bindEvents();
    },

    // 绑定事件
    bindEvents: function() {
      this.handleKeyDown = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.handleKeyDown, true);
    },

    // 键盘事件处理
    handleKeyDown: function(e) {
      if (e.altKey && e.code === 'KeyW') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[WorkMode] Alt+W 检测到');
        this.toggle();
      }
    },

    // 切换显示状态
    toggle: function() {
      if (this.isActive) {
        this.hide();
      } else {
        this.show();
      }
      this.isActive = !this.isActive;
    },

    // 显示覆盖层
    show: function() {
      console.log('[WorkMode] 正在显示覆盖层...');
      this.removeOverlay();

      const elements = this.extractText();
      console.log('[WorkMode] 提取到', elements.length, '个段落');

      // 输出最后3个段落用于调试
      console.log('[WorkMode] 最后3个段落:');
      elements.slice(-3).forEach((el, i) => {
        const idx = elements.length - 2 + i;
        console.log(`  [${idx}] ${el.textContent.trim().substring(0, 50)}...`);
      });

      this.overlay = this.createOverlay(elements);
      document.body.appendChild(this.overlay);

      // 进入全屏
      document.documentElement.requestFullscreen().catch(err => {
        console.log('[WorkMode] 进入全屏失败:', err);
      });

      // 检查覆盖层中的实际内容
      setTimeout(() => {
        const wpsContent = document.getElementById('wps-content');
        if (wpsContent) {
          const pCount = wpsContent.querySelectorAll('p').length;
          console.log('[WorkMode] 覆盖层中实际段落数:', pCount);
          console.log('[WorkMode] 应该有', elements.length, '个段落');
          if (pCount !== elements.length) {
            console.log('[WorkMode] ⚠️ 段落数量不匹配！');
          }
        }
      }, 100);

      console.log('[WorkMode] 覆盖层已显示');
    },

    // 隐藏覆盖层
    hide: function() {
      console.log('[WorkMode] 正在隐藏覆盖层...');
      this.removeOverlay();

      // 退出全屏
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.log('[WorkMode] 退出全屏失败:', err);
        });
      }

      console.log('[WorkMode] 覆盖层已隐藏');
    },

    // 移除覆盖层
    removeOverlay: function() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    },

    // 提取文本内容
    extractText: function() {
      console.log('[WorkMode] 开始提取内容...');

      // 排除关键词
      const excludeKeywords = ['cookie', '隐私政策', '服务条款', 'copyright', '©', '点击接受'];

      function hasExcludeKeyword(text) {
        return excludeKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
      }

      // 小说内容选择器（按优先级排序）
      const novelSelectors = [
        '.muye-reader-content',  // 番茄小说（最优先）
        '.j-chapter-content',
        '.m-reader-text',
        '.chapter-content',
        '.novel-content',
        '.reader-content'
      ];

      // 优先从小说容器提取
      for (const selector of novelSelectors) {
        const container = document.querySelector(selector);
        if (container) {
          console.log(`[WorkMode] 找到容器: ${selector}`);

          // 获取容器内所有p标签
          const allPTags = container.querySelectorAll('p');

          console.log(`[WorkMode] 容器内p标签数: ${allPTags.length}`);

          const validParagraphs = Array.from(allPTags).filter(p => {
            const text = p.textContent.trim();
            return text.length >= 1 && !hasExcludeKeyword(text);
          });

          if (validParagraphs.length >= 10) {
            console.log(`[WorkMode] 提取到 ${validParagraphs.length} 个有效段落`);

            // 输出最后3个段落用于调试
            console.log('[WorkMode] 最后3个段落:');
            validParagraphs.slice(-3).forEach((p, i) => {
              const idx = validParagraphs.length - 2 + i;
              console.log(`  [${idx}] ${p.textContent.trim().substring(0, 50)}...`);
            });

            return validParagraphs;
          }
        }
      }

      // 如果没找到小说容器，使用通用方法
      console.log('[WorkMode] 未找到小说容器，使用通用方法');

      const allPTags = document.querySelectorAll('p');
      const validParagraphs = Array.from(allPTags).filter(p => {
        const text = p.textContent.trim();
        return text.length >= 1 && !hasExcludeKeyword(text);
      });

      console.log(`[WorkMode] 通用方法提取到 ${validParagraphs.length} 个段落`);
      return validParagraphs;
    },

    // 创建覆盖层
    createOverlay: function(elements) {
      const overlay = document.createElement('div');
      overlay.id = 'wps-overlay';
      overlay.className = 'active';

      // 工具栏
      const toolbar = document.createElement('div');
      toolbar.id = 'wps-toolbar';

      const logo = document.createElement('div');
      logo.id = 'wps-logo';
      logo.innerHTML = '<svg style="width:24px;height:24px;vertical-align:middle;margin-right:8px;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M854.6 288.7c6 6 9.4 14.1 9.4 22.6V928c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32h424.7c8.5 0 16.7 3.4 22.7 9.4l215.2 215.3zM790.2 326L602 137.8V326h188.2zM512 566.095l52.814 197.012a12 12 0 0 0 11.59 8.893h31.78a12 12 0 0 0 11.587-8.878l74.375-276a12 12 0 0 0 0.413-3.122c0-6.627-5.373-12-12-12h-35.576a12 12 0 0 0-11.695 9.31l-45.79 199.105-49.76-199.321A12 12 0 0 0 528.097 472h-32.192a12 12 0 0 0-11.643 9.094l-49.66 198.927-46.096-198.732a12 12 0 0 0-11.69-9.289h-35.381a12 12 0 0 0-3.115 0.411c-6.4 1.72-10.194 8.303-8.474 14.703l74.173 276A12 12 0 0 0 415.606 772h31.99a12 12 0 0 0 11.59-8.893L512 566.095z" fill="#ffffff"></path></svg><span>WPS</span>';

      const menu = document.createElement('div');
      menu.id = 'wps-menu';
      const menuItems = ['文件', '开始', '插入', '布局', '引用', '视图'];
      menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'wps-menu-item';
        menuItem.textContent = item;
        menu.appendChild(menuItem);
      });

      toolbar.appendChild(logo);
      toolbar.appendChild(menu);

      // 添加文档标题
      const docTitle = document.createElement('div');
      docTitle.id = 'wps-doc-title';
      docTitle.textContent = '[兼容模式] 文档1.docx';
      toolbar.appendChild(docTitle);

      // 纸张区域
      const paper = document.createElement('div');
      paper.id = 'wps-paper';

      const content = document.createElement('div');
      content.id = 'wps-content';

      // 计算字数
      let totalWordCount = 0;

      // 如果传入了元素列表，直接克隆元素
      if (elements.length > 0 && elements[0] instanceof HTMLElement) {
        elements.forEach(el => {
          const cloned = el.cloneNode(true);
          // 确保克隆的元素保留计算样式
          const computedStyle = window.getComputedStyle(el);
          cloned.style.fontFamily = computedStyle.fontFamily;
          cloned.style.fontSize = computedStyle.fontSize;
          cloned.style.fontWeight = computedStyle.fontWeight;
          cloned.style.lineHeight = computedStyle.lineHeight;
          cloned.style.color = computedStyle.color;
          content.appendChild(cloned);
          totalWordCount += el.textContent.length;
        });
      } else if (elements.length > 0 && typeof elements[0] === 'string') {
        // 字符串文本，使用原来的方式
        elements.forEach(text => {
          const p = document.createElement('p');
          p.textContent = text;
          content.appendChild(p);
          totalWordCount += text.length;
        });
      } else {
        // 空内容
        const empty = document.createElement('div');
        empty.id = 'wps-empty';
        empty.textContent = '无法提取页面内容';
        content.appendChild(empty);
      }

      paper.appendChild(content);
      overlay.appendChild(toolbar);
      overlay.appendChild(paper);

      // 创建底部状态栏
      const statusBar = document.createElement('div');
      statusBar.id = 'wps-statusbar';

      const pageCount = Math.ceil(elements.length / 20);
      const currentPage = 1;
      const wordCountFormatted = totalWordCount.toLocaleString();

      statusBar.innerHTML = `
        <span class="status-item">字数：${wordCountFormatted}</span>
        <span class="status-divider">|</span>
        <span class="status-item">页面：${currentPage}/${pageCount}</span>
        <span class="status-divider">|</span>
        <span class="status-item">拼写检查：已关闭</span>
      `;
      overlay.appendChild(statusBar);

      return overlay;
    },

    // 清理
    cleanup: function() {
      document.removeEventListener('keydown', this.handleKeyDown, true);
      this.removeOverlay();
      const style = document.getElementById('workmode-styles');
      if (style) style.remove();
    }
  };

  // 初始化并保存到全局
  WorkMode.init();
  window.workmodeInstance = WorkMode;

  console.log('[WorkMode] ✅ 安装完成！');
  console.log('[WorkMode] 📝 按 Alt+W 激活/关闭 WorkMode');
})();

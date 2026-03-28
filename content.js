// WorkMode Content Script
// Press Alt+W to toggle WPS camouflage mode

(function() {
  'use strict';

  // Debug: log when script loads
  console.log('[WorkMode] Script loaded successfully');

  // State tracking
  let isActive = false;
  let overlay = null;

  // Keyboard shortcut handler
  document.addEventListener('keydown', function(e) {
    // Debug: log all Alt key combinations
    if (e.altKey) {
      console.log('[WorkMode] Alt key pressed, code:', e.code);
    }

    if (e.altKey && e.code === 'KeyW') {
      console.log('[WorkMode] Alt+W detected - toggling overlay');
      e.preventDefault();
      e.stopPropagation();
      toggleWorkMode();
    }
  }, true); // Use capture phase to catch events earlier

  // Toggle WPS overlay
  function toggleWorkMode() {
    if (isActive) {
      removeOverlay();
      // 退出全屏
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.log('[WorkMode] 退出全屏失败:', err);
        });
      }
    } else {
      createOverlay();
      // 进入全屏
      document.documentElement.requestFullscreen().catch(err => {
        console.log('[WorkMode] 进入全屏失败:', err);
      });
    }
    isActive = !isActive;
  }

  // Create the WPS overlay
  function createOverlay() {
    // Check if overlay already exists
    if (overlay) {
      overlay.remove();
    }

    // Create overlay container
    overlay = document.createElement('div');
    overlay.id = 'wps-overlay';
    overlay.className = 'active';

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'wps-toolbar';

    // Create logo
    const logo = document.createElement('div');
    logo.id = 'wps-logo';
    logo.innerHTML = '<svg style="width:24px;height:24px;vertical-align:middle;margin-right:8px;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M854.6 288.7c6 6 9.4 14.1 9.4 22.6V928c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32h424.7c8.5 0 16.7 3.4 22.7 9.4l215.2 215.3zM790.2 326L602 137.8V326h188.2zM512 566.095l52.814 197.012a12 12 0 0 0 11.59 8.893h31.78a12 12 0 0 0 11.587-8.878l74.375-276a12 12 0 0 0 0.413-3.122c0-6.627-5.373-12-12-12h-35.576a12 12 0 0 0-11.695 9.31l-45.79 199.105-49.76-199.321A12 12 0 0 0 528.097 472h-32.192a12 12 0 0 0-11.643 9.094l-49.66 198.927-46.096-198.732a12 12 0 0 0-11.69-9.289h-35.381a12 12 0 0 0-3.115 0.411c-6.4 1.72-10.194 8.303-8.474 14.703l74.173 276A12 12 0 0 0 415.606 772h31.99a12 12 0 0 0 11.59-8.893L512 566.095z" fill="#ffffff"></path></svg><span>WPS</span>';

    // Create menu
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

    // Create paper container
    const paper = document.createElement('div');
    paper.id = 'wps-paper';

    // Create content area
    const content = document.createElement('div');
    content.id = 'wps-content';

    // Extract and inject text content
    const texts = extractTextContent();
    console.log('[WorkMode] createOverlay: texts.length =', texts.length);

    // 计算字数
    let totalWordCount = 0;
    if (texts.length > 0) {
      console.log('[WorkMode] First paragraph:', texts[0]?.substring(0, 50));
      texts.forEach((text, index) => {
        const p = document.createElement('p');
        p.textContent = text;
        content.appendChild(p);
        totalWordCount += text.length;
        if (index === 0) {
          console.log('[WorkMode] First paragraph element:', p);
          console.log('[WorkMode] First paragraph textContent:', p.textContent);
        }
      });
      console.log('[WorkMode] Content children count:', content.children.length);
    } else {
      console.log('[WorkMode] No texts found, showing empty message');
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

    const pageCount = Math.ceil(texts.length / 20); // 假设每页约20段
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

    // Add to page
    document.body.appendChild(overlay);
    console.log('[WorkMode] Overlay added to page');
    console.log('[WorkMode] Overlay element:', overlay);
    console.log('[WorkMode] Overlay classes:', overlay.className);
    console.log('[WorkMode] Overlay display:', window.getComputedStyle(overlay).display);

    // Check what's actually in the content
    setTimeout(() => {
      const wpsContent = document.getElementById('wps-content');
      const wpsEmpty = document.getElementById('wps-empty');
      console.log('[WorkMode] #wps-content children:', wpsContent?.children.length);
      console.log('[WorkMode] #wps-empty exists:', !!wpsEmpty);
      console.log('[WorkMode] #wps-paper display:', window.getComputedStyle(document.getElementById('wps-paper')).display);
      console.log('[WorkMode] #wps-content display:', window.getComputedStyle(wpsContent).display);
    }, 100);
  }

  // Remove the WPS overlay
  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Extract text content from current page
  function extractTextContent() {
    // Selectors for elements to exclude
    const excludeSelectors = [
      'footer', 'header', 'nav', 'aside',
      '[id*="footer"]', '[class*="footer"]',
      '[id*="header"]', '[class*="header"]',
      '[id*="nav"]', '[class*="nav"]',
      '[id*="sidebar"]', '[class*="sidebar"]',
      '[id*="cookie"]', '[class*="cookie"]',
      '[id*="popup"]', '[class*="popup"]',
      '[id*="modal"]', '[class*="modal"]',
      '[id*="consent"]', '[class*="consent"]',
      '[id*="notice"]', '[class*="notice"]',
      '[id*="dialog"]', '[class*="dialog"]',
      '[id*="ad"]', '[class*="ad"]',
      '[id*="advertisement"]', '[class*="advertisement"]',
      '[id*="privacy"]', '[class*="privacy"]',
      '[id*="policy"]', '[class*="policy"]',
      '[id*="terms"]', '[class*="terms"]',
      '[id*="legal"]', '[class*="legal"]',
      '[id*="disclaimer"]', '[class*="disclaimer"]'
    ];

    // Keywords to exclude (more comprehensive)
    const excludeKeywords = [
      'cookie',
      '隐私政策',
      '隐私声明',
      '服务条款',
      '网站运行离不开',
      '点击接受',
      '点击关闭',
      'copyright',
      '©',
      'all rights reserved',
      '在该服务上向您展示',
      '基于有限的数据',
      '非精确位置',
      '设备类型',
      '与之互动',
      '限制向您展示',
      '个性化',
      '内容设置',
      '拒绝所有',
      '接受所有',
      '必要 Cookie',
      '目标 Cookie',
      '统计数据 Cookie',
      '体验 Cookie'
    ];

    // Helper: check if element or any parent matches exclude selectors
    function isExcluded(element) {
      let current = element;
      let depth = 0;
      while (current && current !== document.body && depth < 8) {
        // Check if element matches any exclude selector
        for (const selector of excludeSelectors) {
          try {
            if (current.matches && current.matches(selector)) {
              // Only exclude exact matches for footer/header/nav
              const tagName = current.tagName.toLowerCase();
              const id = current.id || '';
              const className = current.className || '';

              // Only exclude if it's actually a footer/header/nav element
              if (tagName === 'footer' || tagName === 'header' || tagName === 'nav' || tagName === 'aside' ||
                  id === 'footer' || id === 'header' || id === 'nav' ||
                  className === 'footer' || className === 'header' || className === 'nav') {
                return true;
              }
            }
          } catch (e) {}
        }
        current = current.parentElement;
        depth++;
      }
      return false;
    }

    // Helper: check if text contains exclude keywords
    function hasExcludeKeyword(text) {
      const lowerText = text.toLowerCase();
      return excludeKeywords.some(keyword =>
        lowerText.includes(keyword.toLowerCase())
      );
    }

    // Priority-based extraction: try main content areas first
    const contentAreaSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '#content',
      '#article',
      '#main'
    ];

    // First, try to find paragraphs in main content areas
    const mainParagraphs = [];
    for (const selector of contentAreaSelectors) {
      const areas = document.querySelectorAll(selector);
      for (const area of areas) {
        const paragraphs = area.querySelectorAll('p');
        mainParagraphs.push(...Array.from(paragraphs));
      }
      if (mainParagraphs.length >= 10) break; // Found enough content
    }

    // If not enough in main areas, fall back to all paragraphs
    const allParagraphs = mainParagraphs.length > 0
      ? mainParagraphs
      : Array.from(document.querySelectorAll('p'));

    console.log('[WorkMode] Found', allParagraphs.length, 'paragraphs total');

    // Filter
    const texts = [];

    for (const p of allParagraphs) {
      // Skip if excluded by selector
      if (isExcluded(p)) {
        continue;
      }

      const text = p.textContent.trim();

      // Skip if too short (allow short phrases like 轰隆——)
      if (text.length < 1) continue;

      // Skip if contains exclude keywords
      if (hasExcludeKeyword(text)) {
        console.log('[WorkMode] Skipped (has keyword):', text.substring(0, 30));
        continue;
      }

      // Additional quality check: skip if starts with common policy phrases
      if (/^(本网站|我们使用|cookie|点击|接受|关闭|拒绝)/i.test(text)) {
        console.log('[WorkMode] Skipped (policy text):', text.substring(0, 30));
        continue;
      }

      texts.push(text);

      // Limit to avoid overwhelming content
      if (texts.length >= 200) break;
    }

    console.log('[WorkMode] Extracted', texts.length, 'paragraphs');
    return texts;
  }

})();

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
    } else {
      createOverlay();
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
    logo.innerHTML = '<span>📄</span><span>WPS</span>';

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

    // Create paper container
    const paper = document.createElement('div');
    paper.id = 'wps-paper';

    // Create content area
    const content = document.createElement('div');
    content.id = 'wps-content';

    // Extract and inject text content
    const texts = extractTextContent();
    if (texts.length > 0) {
      texts.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        content.appendChild(p);
      });
    } else {
      const empty = document.createElement('div');
      empty.id = 'wps-empty';
      empty.textContent = '无法提取页面内容';
      content.appendChild(empty);
    }

    paper.appendChild(content);
    overlay.appendChild(toolbar);
    overlay.appendChild(paper);

    // Add to page
    document.body.appendChild(overlay);
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
    // Common cookie/popup/notice selectors to exclude
    const excludeSelectors = [
      '[id*="cookie"]', '[class*="cookie"]',
      '[id*="popup"]', '[class*="popup"]',
      '[id*="modal"]', '[class*="modal"]',
      '[id*="notice"]', '[class*="notice"]',
      '[id*="banner"]', '[class*="banner"]',
      '[id*="dialog"]', '[class*="dialog"]',
      '[id*="consent"]', '[class*="consent"]',
      '[id*="privacy"]', '[class*="privacy"]',
      '[id*="footer"]', '[class*="footer"]',
      '[id*="header"]', '[class*="header"]',
      '[id*="nav"]', '[class*="nav"]',
      '[id*="sidebar"]', '[class*="sidebar"]',
      '[id*="ad"]', '[class*="ad"]'
    ];

    // Keywords to exclude
    const excludeKeywords = [
      'cookie', ' Cookie', 'cookie ',
      '隐私', '隐私政策', '隐私声明',
      '点击关闭', '点击接受', '同意',
      '本网站使用', '网站运行离不开',
      '继续浏览', '继续使用',
      '关闭', 'accept', 'Accept'
    ];

    // Helper: check if element or any parent matches exclude selectors
    function isExcluded(element) {
      let current = element;
      while (current && current !== document.body) {
        // Check selector matches
        for (const selector of excludeSelectors) {
          if (current.matches && current.matches(selector)) {
            return true;
          }
        }
        current = current.parentElement;
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

    // Get paragraphs from main content areas first
    const mainContentSelectors = [
      'article p',
      'main p',
      '[role="main"] p',
      '.content p',
      '.post-content p',
      '.article-content p',
      '.entry-content p',
      '#content p',
      'p'
    ];

    const allParagraphs = [];
    for (const selector of mainContentSelectors) {
      const elements = document.querySelectorAll(selector);
      allParagraphs.push(...Array.from(elements));
    }

    // Deduplicate and filter
    const seen = new Set();
    const texts = [];

    for (const p of allParagraphs) {
      // Skip if already processed
      if (seen.has(p)) continue;
      seen.add(p);

      // Skip if excluded by selector
      if (isExcluded(p)) continue;

      const text = p.textContent.trim();

      // Skip if too short
      if (text.length < 15) continue;

      // Skip if contains exclude keywords
      if (hasExcludeKeyword(text)) continue;

      texts.push(text);

      // Limit to avoid overwhelming content
      if (texts.length >= 50) break;
    }

    console.log('[WorkMode] Extracted', texts.length, 'paragraphs');
    return texts;
  }

})();

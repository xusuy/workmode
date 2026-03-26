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
    console.log('[WorkMode] createOverlay: texts.length =', texts.length);
    if (texts.length > 0) {
      console.log('[WorkMode] First paragraph:', texts[0]?.substring(0, 50));
      texts.forEach((text, index) => {
        const p = document.createElement('p');
        p.textContent = text;
        content.appendChild(p);
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
              return true;
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

      // Skip if too short
      if (text.length < 15) continue;

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
      if (texts.length >= 50) break;
    }

    console.log('[WorkMode] Extracted', texts.length, 'paragraphs');
    return texts;
  }

})();

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

    // Get chapter info
    const chapterInfo = getChapterInfo();

    // Extract and inject content (elements for font preservation)
    const elements = extractTextContent();
    console.log('[WorkMode] createOverlay: elements.length =', elements.length);

    // 计算字数
    let totalWordCount = 0;

    if (elements.length > 0) {
      // Add chapter title at the top of paper content
      if (chapterInfo.title) {
        const chapterTitle = document.createElement('div');
        chapterTitle.style.cssText = 'font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #333;';
        chapterTitle.textContent = chapterInfo.title;
        content.appendChild(chapterTitle);
        console.log('[WorkMode] 添加章节标题:', chapterInfo.title);
      }

      // Clone elements to preserve fonts
      elements.forEach((el, index) => {
        const cloned = el.cloneNode(true);
        // Preserve computed styles for special fonts
        const computedStyle = window.getComputedStyle(el);
        cloned.style.fontFamily = computedStyle.fontFamily;
        cloned.style.fontSize = computedStyle.fontSize;
        cloned.style.fontWeight = computedStyle.fontWeight;
        cloned.style.lineHeight = computedStyle.lineHeight;
        cloned.style.color = computedStyle.color;
        content.appendChild(cloned);
        totalWordCount += el.textContent.length;
        if (index === 0) {
          console.log('[WorkMode] First element:', cloned);
          console.log('[WorkMode] First element textContent:', cloned.textContent?.substring(0, 50));
        }
      });
      console.log('[WorkMode] Content children count:', content.children.length);
    } else {
      console.log('[WorkMode] No content found, showing empty message');
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

  // Extract text content from current page - returns HTML elements for font preservation
  function extractTextContent() {
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
        console.log('[WorkMode] 找到容器:', selector);

        // 获取容器内所有p标签
        const allPTags = container.querySelectorAll('p');

        console.log('[WorkMode] 容器内p标签数:', allPTags.length);

        const validParagraphs = Array.from(allPTags).filter(p => {
          const text = p.textContent.trim();
          return text.length >= 1 && !hasExcludeKeyword(text);
        });

        if (validParagraphs.length >= 10) {
          console.log('[WorkMode] 提取到', validParagraphs.length, '个有效段落');
          return validParagraphs;
        }
      }
    }

    // 如果没找到小说容器，使用通用方法
    console.log('[WorkMode] 未找到小说容器，使用通用方法');

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

    // Filter and return elements (not text)
    const validParagraphs = allParagraphs.filter(p => {
      const text = p.textContent.trim();
      return text.length >= 1 && !hasExcludeKeyword(text);
    });

    console.log('[WorkMode] Extracted', validParagraphs.length, 'paragraphs');
    return validParagraphs;
  }

  // Get chapter title from page
  function getChapterInfo() {
    const info = { title: '' };

    try {
      const bodyText = document.body.textContent;

      // Try to match chapter pattern: 第X章 [标题] 本章字数
      const chapterMatch = bodyText.match(/第(\d+)章\s*([^\n]{1,30}?)(?:\s*本章字数)/);

      if (chapterMatch) {
        info.title = '第' + chapterMatch[1] + '章 ' + chapterMatch[2].trim();
        console.log('[WorkMode] 提取的章节信息:', info);
      } else {
        console.log('[WorkMode] 未找到章节标题');
      }
    } catch (e) {
      console.log('[WorkMode] 提取章节信息失败:', e);
    }

    return info;
  }

})();

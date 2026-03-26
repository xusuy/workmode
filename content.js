// WorkMode Content Script
// Press Ctrl+Shift+W to toggle WPS camouflage mode

(function() {
  'use strict';

  // State tracking
  let isActive = false;
  let overlay = null;

  // Keyboard shortcut handler
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
      e.preventDefault();
      toggleWorkMode();
    }
  });

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
    const paragraphs = document.querySelectorAll(
      'article p, .content p, .post p, .article p, p'
    );
    const texts = Array.from(paragraphs)
      .map(p => p.textContent.trim())
      .filter(text => text.length > 10);

    return texts;
  }

})();

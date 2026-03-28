// WorkMode Content Script
// Press Alt+W to toggle WPS camouflage mode

(function() {
  'use strict';

  console.log('[WorkMode] Script loaded successfully');

  let isActive = false;
  let overlay = null;

  const chapterState = {
    loadedChapters: [],
    isLoading: false
  };

  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.code === 'KeyW') {
      e.preventDefault();
      e.stopPropagation();
      toggleWorkMode();
    }
  }, true);

  function toggleWorkMode() {
    if (isActive) {
      removeOverlay();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {});
      }
    } else {
      createOverlay();
      document.documentElement.requestFullscreen().catch(err => {});
    }
    isActive = !isActive;
  }

  function createOverlay() {
    if (overlay) {
      overlay.remove();
    }

    overlay = document.createElement('div');
    overlay.id = 'wps-overlay';
    overlay.className = 'active';

    // Toolbar
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

    const docTitle = document.createElement('div');
    docTitle.id = 'wps-doc-title';
    docTitle.textContent = '[兼容模式] 文档1.docx';
    toolbar.appendChild(docTitle);

    // Paper container
    const paper = document.createElement('div');
    paper.id = 'wps-paper';

    const content = document.createElement('div');
    content.id = 'wps-content';

    // 提取当前章节标题
    const currentChapterTitle = extractChapterTitleFromDoc(document);
    if (currentChapterTitle !== '未知章节') {
      const titleSeparator = document.createElement('div');
      titleSeparator.className = 'chapter-separator';
      titleSeparator.innerHTML = `
        <div class="chapter-title">${currentChapterTitle}</div>
        <div class="chapter-divider"></div>
      `;
      content.appendChild(titleSeparator);
    }

    // Extract current chapter content
    const elements = extractTextContent();
    let totalWordCount = 0;

    if (elements.length > 0) {
      elements.forEach(el => {
        const cloned = el.cloneNode(true);
        const computedStyle = window.getComputedStyle(el);
        cloned.style.fontFamily = computedStyle.fontFamily;
        cloned.style.fontSize = computedStyle.fontSize;
        cloned.style.fontWeight = computedStyle.fontWeight;
        cloned.style.lineHeight = computedStyle.lineHeight;
        cloned.style.color = computedStyle.color;
        content.appendChild(cloned);
        totalWordCount += el.textContent.length;
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

    // Status bar
    const statusBar = document.createElement('div');
    statusBar.id = 'wps-statusbar';
    const pageCount = Math.ceil(elements.length / 20);
    const wordCountFormatted = totalWordCount.toLocaleString();
    statusBar.innerHTML = `
      <span class="status-item">字数：${wordCountFormatted}</span>
      <span class="status-divider">|</span>
      <span class="status-item">页面：1/${pageCount}</span>
      <span class="status-divider">|</span>
      <span class="status-item">拼写检查：已关闭</span>
    `;
    overlay.appendChild(statusBar);

    document.body.appendChild(overlay);

    // "加载下一章"按钮 - 必须在 appendChild 之后创建
    const hasNextChapter = Array.from(document.querySelectorAll('button')).some(btn =>
      btn.textContent.includes('下一章')
    );

    if (hasNextChapter) {
      createLoadNextButton();
      console.log('[WorkMode] 已显示"加载下一章"按钮');
    }
  }

  // 创建"加载下一章"按钮
  function createLoadNextButton() {
    const content = document.getElementById('wps-content');
    if (!content) return;

    const loadButton = document.createElement('button');
    loadButton.id = 'wps-load-next-btn';
    loadButton.className = 'wps-load-next-btn';
    loadButton.textContent = '加载下一章';
    loadButton.onclick = () => loadNextChapter();
    content.appendChild(loadButton);
  }

  // Remove overlay
  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Extract text content
  function extractTextContent() {
    const excludeKeywords = [
      'cookie', '隐私政策', '服务条款', 'copyright', '©', '点击接受',
      'all rights reserved', '个性化', '内容设置', '拒绝所有', '接受所有'
    ];

    function hasExcludeKeyword(text) {
      const lowerText = text.toLowerCase();
      return excludeKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
    }

    const novelSelectors = [
      '.muye-reader-content', '.j-chapter-content', '.m-reader-text',
      '.chapter-content', '.novel-content', '.reader-content'
    ];

    for (const selector of novelSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const allPTags = container.querySelectorAll('p');
        const validParagraphs = Array.from(allPTags).filter(p => {
          const text = p.textContent.trim();
          return text.length >= 1 && !hasExcludeKeyword(text);
        });
        if (validParagraphs.length >= 10) {
          return validParagraphs;
        }
      }
    }

    const allPTags = document.querySelectorAll('p');
    return Array.from(allPTags).filter(p => {
      const text = p.textContent.trim();
      return text.length >= 1 && !hasExcludeKeyword(text);
    });
  }

  // 等待元素出现
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`等待元素超时: ${selector}`));
      }, timeout);
    });
  }

  // 从文档提取章节标题
  function extractChapterTitleFromDoc(doc) {
    try {
      const bodyText = doc.body.textContent;
      const match = bodyText.match(/第(\d+)章\s*([^\n]{1,30}?)(?:\s*本章字数)/);
      if (match) {
        return '第' + match[1] + '章 ' + match[2].trim();
      }
    } catch (e) {}
    return '未知章节';
  }

  // 显示提示
  function showMessage(message) {
    const oldMessage = document.getElementById('wps-temp-message');
    if (oldMessage) oldMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'wps-temp-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      background-color: rgba(43, 87, 154, 0.9); color: white;
      padding: 10px 20px; border-radius: 4px; z-index: 2147483649; font-size: 14px;
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
  }

  // 更新按钮状态
  function updateLoadButtonState(state) {
    const button = document.getElementById('wps-load-next-btn');
    if (!button) return;

    switch (state) {
      case 'loading':
        button.textContent = '加载中...';
        button.disabled = true;
        button.classList.add('loading');
        break;
      case 'available':
        button.textContent = '加载下一章';
        button.disabled = false;
        button.classList.remove('loading');
        break;
      case 'finished':
        button.remove();
        break;
      case 'error':
        button.textContent = '加载失败，重试';
        button.disabled = false;
        button.classList.remove('loading');
        break;
    }
  }

  // 追加章节内容
  function appendChapterContent(title, paragraphs) {
    const content = document.getElementById('wps-content');
    if (!content) return;

    const separator = document.createElement('div');
    separator.className = 'chapter-separator';
    separator.innerHTML = `
      <div class="chapter-title">${title}</div>
      <div class="chapter-divider"></div>
    `;
    content.appendChild(separator);

    paragraphs.forEach(p => {
      const cloned = p.cloneNode(true);
      const computedStyle = window.getComputedStyle(p);
      cloned.style.fontFamily = computedStyle.fontFamily;
      cloned.style.fontSize = computedStyle.fontSize;
      cloned.style.fontWeight = computedStyle.fontWeight;
      cloned.style.lineHeight = computedStyle.lineHeight;
      cloned.style.color = computedStyle.color;
      content.appendChild(cloned);
    });

    setTimeout(() => {
      separator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // 加载下一章 - 点击番茄小说按钮
  async function loadNextChapter() {
    if (chapterState.isLoading) return;

    chapterState.isLoading = true;
    updateLoadButtonState('loading');

    try {
      console.log('[WorkMode] 开始加载下一章...');

      // 找到"下一章"按钮
      const nextButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('下一章')
      );

      if (!nextButton) {
        throw new Error('未找到"下一章"按钮');
      }

      // 记录当前内容
      const currentContent = document.querySelector('.muye-reader-content');
      const currentText = currentContent?.textContent || '';

      // 点击按钮
      console.log('[WorkMode] 点击"下一章"按钮');
      nextButton.click();

      // 等待新内容加载
      console.log('[WorkMode] 等待新内容加载...');
      await waitForElement('.muye-reader-content');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证内容是否变化
      const newContent = document.querySelector('.muye-reader-content');
      const newText = newContent?.textContent || '';

      if (newText === currentText) {
        throw new Error('内容未变化，可能已到最后一章');
      }

      console.log('[WorkMode] 新内容已加载');

      // 提取新章节内容
      const newParagraphs = Array.from(newContent.querySelectorAll('p'));
      console.log('[WorkMode] 提取到', newParagraphs.length, '个段落');

      const chapterTitle = extractChapterTitleFromDoc(document);

      // 追加到界面（注意：这里不会删除按钮）
      appendChapterContent(chapterTitle, newParagraphs);

      chapterState.loadedChapters.push(window.location.href);
      console.log('[WorkMode] 已加载章节:', chapterState.loadedChapters.length);

      // 检查是否还有下一章，并重新创建按钮
      setTimeout(() => {
        const stillHasNext = Array.from(document.querySelectorAll('button')).some(btn =>
          btn.textContent.includes('下一章')
        );

        if (stillHasNext) {
          // 删除旧按钮并创建新按钮
          const oldButton = document.getElementById('wps-load-next-btn');
          if (oldButton) oldButton.remove();
          createLoadNextButton();
        } else {
          updateLoadButtonState('finished');
          showMessage('已到最后一章');
        }
      }, 100);

    } catch (error) {
      console.error('[WorkMode] 加载失败:', error);
      showMessage('加载失败：' + error.message);
      updateLoadButtonState('error');
    }

    chapterState.isLoading = false;
  }

})();

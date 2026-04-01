// WorkMode Content Script
// Press Alt+W to toggle WPS camouflage mode

(async function() {
  'use strict';

  console.log('[WorkMode] Script loaded successfully');

  // Initialize config loader
  if (window.WorkModeConfigLoader) {
    await window.WorkModeConfigLoader.loadAllConfigs();
    window.WorkModeConfigLoader.getConfigForPage();
  }

  let isActive = false;
  let overlay = null;

  const chapterState = {
    loadedChapters: [],
    isLoading: false,
    lastFetchedHtml: null,      // 最后一次 fetch 的 HTML
    lastFetchedUrl: null,        // 最后一次 fetch 的 URL
    lastFetchedDoc: null         // 最后一次 fetch 的解析文档
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
    const config = window.WorkModeConfigLoader?.getConfig();
    const buttonSelector = config?.nextChapter?.buttonSelector || 'button';
    const buttonText = config?.nextChapter?.buttonText || '下一章';
    const hasNextChapter = Array.from(document.querySelectorAll(buttonSelector)).some(btn =>
      btn.textContent.includes(buttonText)
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
    const config = window.WorkModeConfigLoader?.getConfig();
    const excludeKeywords = config?.excludeKeywords || [
      'cookie', '隐私政策', '服务条款', 'copyright', '©'
    ];

    function hasExcludeKeyword(text) {
      const lowerText = text.toLowerCase();
      return excludeKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
    }

    // Use config selector if available
    if (config?.content?.selector) {
      const container = document.querySelector(config.content.selector);
      if (container) {
        const paragraphSelector = config.content.paragraphSelector || 'p';
        const allPTags = container.querySelectorAll(paragraphSelector);
        const minParagraphLength = config.content.minParagraphLength || 1;
        const minParagraphCount = config.content.minParagraphCount || 10;

        const validParagraphs = Array.from(allPTags).filter(p => {
          const text = p.textContent.trim();
          return text.length >= minParagraphLength && !hasExcludeKeyword(text);
        });
        if (validParagraphs.length >= minParagraphCount) {
          return validParagraphs;
        }
      }
    }

    // Fallback: try generic novel selectors
    const fallbackSelectors = [
      '.muye-reader-content', '.j-chapter-content', '.m-reader-text',
      '.chapter-content', '.novel-content', '.reader-content'
    ];

    for (const selector of fallbackSelectors) {
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

    // Last resort: all p tags
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
      const config = window.WorkModeConfigLoader?.getConfig();
      const titleConfig = config?.chapterTitle || {};
      const titleSelector = titleConfig.selector;
      const regexPattern = titleConfig.regex || '第(\\d+)章\\s+([^\\n]+)';
      const format = titleConfig.format || '第{chapter}章 {title}';

      // 方法1：从页面 title 标签提取（最高优先级 - 最可靠）
      const titleElement = doc.querySelector('title');
      if (titleElement) {
        const titleText = titleElement.textContent.trim();
        console.log('[WorkMode] 页面 title:', titleText);

        // 起点格式: "第1章 牛顿的感谢 _《书名》小说在线阅读 - 起点中文网"
        // 匹配从开头到"_"或"《"之间的内容
        const qidianMatch = titleText.match(/^(第\d+章\s+[^_《]+?)(?=_|《|$)/);
        if (qidianMatch) {
          const title = qidianMatch[1].trim();
          console.log('[WorkMode] 从 title 提取起点标题:', title);
          return title;
        }

        // 番茄格式: "我不是戏神第1章 截鬼回家在线免费阅读_番茄小说官网"
        // 匹配"第X章"后跟中文字符，在遇到"在线"、"免费"、"阅读"等词之前停止
        const fanqieMatch = titleText.match(/(第\d+章\s+.*?)(?=在线|免费|阅读|_|$)/);
        if (fanqieMatch) {
          const title = fanqieMatch[1].trim();
          console.log('[WorkMode] 从 title 提取番茄标题:', title);
          return title;
        }

        // 如果上面都失败，尝试简单匹配
        const simpleMatch = titleText.match(/(第\d+章\s+[\u4e00-\u9fa5]+)/);
        if (simpleMatch) {
          console.log('[WorkMode] 简单匹配标题:', simpleMatch[1]);
          return simpleMatch[1];
        }
      }

      // 方法2：使用平台特定的选择器（回退 - 可能是书名）
      if (titleSelector) {
        const titleElement = doc.querySelector(titleSelector);
        if (titleElement) {
          let titleText = titleElement.textContent.trim();
          // 检查是否包含章节格式
          if (titleText.match(/第\d+章/)) {
            // 长度检查
            if (titleText.length > 100) {
              console.warn('[WorkMode] 标题过长，尝试提取章节名');
              const chapterMatch = titleText.match(/第\d+章\s+[^\n]{1,30}/);
              if (chapterMatch) {
                titleText = chapterMatch[0];
              } else {
                titleText = titleText.substring(0, 50);
              }
            }
            console.log('[WorkMode] 从平台选择器提取标题:', titleSelector, '->', titleText);
            return titleText;
          } else {
            console.log('[WorkMode] 平台选择器不包含章节格式，跳过');
          }
        }
      }

      // 方法3：从页面 h1 标题提取（回退 - 番茄 h1 是书名不是章节名）
      const h1Element = doc.querySelector('h1');
      if (h1Element) {
        let titleText = h1Element.textContent.trim();
        // 检查 h1 是否包含章节格式
        if (titleText.match(/第\d+章/)) {
          // 如果 h1 内容过长，尝试提取真正的章节标题
          if (titleText.length > 50) {
            const chapterMatch = titleText.match(/第\d+章\s+[^\n]{1,30}/);
            if (chapterMatch) {
              titleText = chapterMatch[0];
            } else {
              titleText = titleText.substring(0, 30);
            }
          }
          console.log('[WorkMode] 从 h1 提取标题:', titleText);
          return titleText;
        } else {
          console.log('[WorkMode] h1 不包含章节格式，可能是书名');
        }
      }

      // 方法4：从 meta 标签提取（多种选择器）
      const metaSelectors = [
        'meta[property="og:title"]',
        'meta[name="title"]',
        'meta[name="keywords"]',
        'meta[property="chapter:title"]'
      ];
      for (const selector of metaSelectors) {
        const metaElement = doc.querySelector(selector);
        if (metaElement && (metaElement.content || metaElement.value)) {
          const metaText = (metaElement.content || metaElement.value).trim();
          console.log('[WorkMode] 检查 meta', selector, ':', metaText);

          // 从 meta 内容中提取章节名
          const chapterMatch = metaText.match(/第\d+章\s+[^,_\s]{1,30}/);
          if (chapterMatch) {
            console.log('[WorkMode] 从 meta 提取标题:', chapterMatch[0]);
            return chapterMatch[0];
          }
        }
      }

      // 方法5：用正则从 body 文本提取（最后回退）
      const bodyText = doc.body.textContent;
      const regex = new RegExp(regexPattern);
      const match = bodyText.match(regex);

      if (match) {
        // 限制标题长度，避免匹配过多内容
        let title = match[2].trim();
        if (title.length > 30) {
          title = title.substring(0, 30);
        }
        console.log('[WorkMode] 从正则提取标题:', match[1], title);
        return format
          .replace('{chapter}', match[1])
          .replace('{title}', title);
      }
    } catch (e) {
      console.warn('[WorkMode] Chapter title extraction failed:', e);
    }
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

    // 防止标题过长（安全检查）
    let safeTitle = title;
    if (typeof title !== 'string') {
      safeTitle = String(title);
    }
    if (safeTitle.length > 100) {
      console.warn('[WorkMode] 标题过长，已截断:', safeTitle.length, '-> 100字符');
      safeTitle = safeTitle.substring(0, 100) + '...';
    }

    const separator = document.createElement('div');
    separator.className = 'chapter-separator';
    separator.innerHTML = `
      <div class="chapter-title">${safeTitle}</div>
      <div class="chapter-divider"></div>
    `;
    content.appendChild(separator);

    paragraphs.forEach(p => {
      const cloned = p.cloneNode(true);

      // 检查元素是否在当前 DOM 中（fetched 元素不在 DOM 中）
      const isInDOM = document.contains(p);

      if (isInDOM) {
        // 元素在 DOM 中，可以使用 getComputedStyle
        const computedStyle = window.getComputedStyle(p);
        cloned.style.fontFamily = computedStyle.fontFamily;
        cloned.style.fontSize = computedStyle.fontSize;
        cloned.style.fontWeight = computedStyle.fontWeight;
        cloned.style.lineHeight = computedStyle.lineHeight;
        cloned.style.color = computedStyle.color;
      } else {
        // 元素不在 DOM 中（来自 fetched HTML），复制内联样式
        // 如果原元素有内联样式，保留它们
        if (p.style.fontFamily) cloned.style.fontFamily = p.style.fontFamily;
        if (p.style.fontSize) cloned.style.fontSize = p.style.fontSize;
        if (p.style.fontWeight) cloned.style.fontWeight = p.style.fontWeight;
        if (p.style.lineHeight) cloned.style.lineHeight = p.style.lineHeight;
        if (p.style.color) cloned.style.color = p.style.color;

        // 对于没有内联样式的情况，检查父元素
        let parent = p.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          if (parent.style.fontFamily) {
            cloned.style.fontFamily = parent.style.fontFamily;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      }

      content.appendChild(cloned);
    });

    setTimeout(() => {
      separator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // 加载下一章 - 支持 SPA 和 MPA 两种模式
  async function loadNextChapter() {
    if (chapterState.isLoading) return;

    const config = window.WorkModeConfigLoader?.getConfig();

    chapterState.isLoading = true;
    updateLoadButtonState('loading');

    try {
      console.log('[WorkMode] 开始加载下一章...');

      const method = config?.nextChapter?.method || 'click';
      const buttonSelector = config?.nextChapter?.buttonSelector || 'button';
      const buttonText = config?.nextChapter?.buttonText || '下一章';
      const contentSelector = config?.nextChapter?.contentSelector || '.muye-reader-content';
      const loadDelay = config?.nextChapter?.loadDelay || 500;

      if (method === 'fetch') {
        // MPA 模式：使用 fetch 获取下一页内容
        console.log('[WorkMode] 使用 MPA fetch 模式');

        // 确定从哪个文档查找"下一章"链接
        // 如果之前有 fetch 过的页面，从那个页面找；否则从当前页面找
        const sourceDoc = chapterState.lastFetchedDoc || document;
        console.log('[WorkMode] 查找链接的来源:', chapterState.lastFetchedUrl ? '上次加载的章节' : '当前页面');
        if (chapterState.lastFetchedUrl) {
          console.log('[WorkMode] 上次加载的URL:', chapterState.lastFetchedUrl);
        }

        // 找到"下一章"链接 - 从正确的文档中查找
        let nextButton = Array.from(sourceDoc.querySelectorAll(buttonSelector)).find(btn =>
          btn.textContent.trim() === buttonText
        );

        // 如果没有完全匹配，则选择包含该文本的
        if (!nextButton) {
          nextButton = Array.from(sourceDoc.querySelectorAll(buttonSelector)).find(btn =>
            btn.textContent.includes(buttonText) && btn.textContent.trim().length < 20
          );
        }

        if (!nextButton) {
          throw new Error('未找到"' + buttonText + '"链接');
        }

        const nextUrl = nextButton.href;
        if (!nextUrl) {
          throw new Error('无法获取下一章 URL');
        }

        console.log('[WorkMode] 下一章 URL:', nextUrl);
        console.log('[WorkMode] 链接文本:', nextButton.textContent.trim());

        // 检查是否重复加载
        if (chapterState.loadedChapters.includes(nextUrl)) {
          console.log('[WorkMode] ⚠️ 警告：这个章节已经加载过了');
          throw new Error('下一章已加载，可能已到最后一章');
        }

        // 获取下一页 HTML
        const response = await fetch(nextUrl);
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(html, 'text/html');

        console.log('[WorkMode] HTML 解析成功，长度:', html.length);
        console.log('[WorkMode] 尝试选择器:', contentSelector);

        // 从新页面提取内容 - 支持多种选择器回退
        let newContent = newDoc.querySelector(contentSelector);

        // 如果主选择器失败，尝试备用选择器
        if (!newContent) {
          console.log('[WorkMode] 主选择器失败，尝试备用选择器...');
          const fallbackSelectors = [
            '.content',
            '.read-content',
            '#chapter-1',
            '.chapter-content',
            '.main-content',
            '[class*="content"]',
            'main',
            'article'
          ];

          for (const sel of fallbackSelectors) {
            if (sel === contentSelector) continue; // 跳过已尝试的主选择器
            const el = newDoc.querySelector(sel);
            if (el) {
              const pCount = el.querySelectorAll('p').length;
              const textLen = el.textContent.trim().length;
              console.log(`[WorkMode] ${sel}: ${pCount}段, ${textLen}字符`);
              if (pCount >= 5 && textLen > 200) {
                newContent = el;
                console.log('[WorkMode] 使用选择器:', sel);
                break;
              }
            }
          }
        }

        if (!newContent) {
          // 最后尝试：直接查找所有段落，找最可能的容器
          console.log('[WorkMode] 选择器都失败，尝试查找文本最丰富的容器...');
          const allDivs = newDoc.querySelectorAll('div');
          let bestContainer = null;
          let maxPCount = 0;

          allDivs.forEach(div => {
            const pCount = div.querySelectorAll('p').length;
            if (pCount > maxPCount && pCount >= 5) {
              const textLen = div.textContent.trim().length;
              if (textLen > 200) {
                maxPCount = pCount;
                bestContainer = div;
              }
            }
          });

          if (bestContainer) {
            newContent = bestContainer;
            console.log('[WorkMode] 找到最佳容器:', maxPCount, '个段落');
          } else {
            throw new Error('无法在页面中找到内容区域，可能页面结构已更改或需要登录');
          }
        }

        const paragraphSelector = config?.content?.paragraphSelector || 'p';
        const newParagraphs = Array.from(newContent.querySelectorAll(paragraphSelector));
        console.log('[WorkMode] 最终提取到', newParagraphs.length, '个段落');

        // 显示前3段内容预览（用于诊断）
        console.log('[WorkMode] 新章节内容预览:');
        for (let i = 0; i < Math.min(3, newParagraphs.length); i++) {
          const text = newParagraphs[i].textContent.trim();
          console.log('  段[' + i + ']:', text.substring(0, 60) + (text.length > 60 ? '...' : ''));
        }

        // 检查内容是否为空
        if (newParagraphs.length === 0) {
          throw new Error('新章节没有找到任何段落内容');
        }

        // 检查是否与当前内容重复（最后一章问题）
        const currentContentEl = document.querySelector(contentSelector) ||
                                document.querySelector('.content') ||
                                document.getElementById('wps-content');
        if (currentContentEl) {
          const currentText = currentContentEl.textContent.trim().substring(0, 500);
          const newText = newContent.textContent.trim().substring(0, 500);

          if (currentText === newText || currentText.length > 0 && newText.includes(currentText)) {
            console.log('[WorkMode] 检测到内容重复，可能已到最后一章');
            updateLoadButtonState('finished');
            showMessage('已到最后一章');
            chapterState.isLoading = false;
            return;
          }
        }

        // 提取章节标题
        const chapterTitle = extractChapterTitleFromDoc(newDoc);
        console.log('[WorkMode] 提取的章节标题:', chapterTitle);
        console.log('[WorkMode] 标题长度:', chapterTitle.length);

        // 检查标题是否异常长（可能包含了正文）
        if (chapterTitle.length > 100) {
          console.log('[WorkMode] ⚠️ 警告：标题异常长，可能包含正文内容');
          console.log('[WorkMode] 标题前100字符:', chapterTitle.substring(0, 100));
        }

        // 追加到界面
        appendChapterContent(chapterTitle, newParagraphs);

        chapterState.loadedChapters.push(nextUrl);
        console.log('[WorkMode] 已加载章节:', chapterState.loadedChapters.length);

        // 保存最后一次 fetch 的信息，用于下一次查找"下一章"链接
        chapterState.lastFetchedUrl = nextUrl;
        chapterState.lastFetchedHtml = html;
        chapterState.lastFetchedDoc = newDoc;
        console.log('[WorkMode] 已保存章节信息用于下次查找链接');

        // 检查新页面是否还有"下一章"
        const verificationDelay = config?.nextChapter?.verificationDelay || 100;
        setTimeout(() => {
          const stillHasNext = Array.from(newDoc.querySelectorAll(buttonSelector)).some(btn =>
            btn.textContent.includes(buttonText)
          );

          if (stillHasNext) {
            const oldButton = document.getElementById('wps-load-next-btn');
            if (oldButton) oldButton.remove();
            createLoadNextButton();
          } else {
            updateLoadButtonState('finished');
            showMessage('已到最后一章');
          }
        }, verificationDelay);

      } else {
        // SPA 模式：点击按钮，等待内容原地变化
        console.log('[WorkMode] 使用 SPA click 模式');

        const nextButton = Array.from(document.querySelectorAll(buttonSelector)).find(btn =>
          btn.textContent.includes(buttonText)
        );

        if (!nextButton) {
          throw new Error('未找到"' + buttonText + '"按钮');
        }

        // 记录当前内容
        const currentContent = document.querySelector(contentSelector);
        const currentText = currentContent?.textContent || '';

        // 点击按钮
        console.log('[WorkMode] 点击"' + buttonText + '"按钮');
        nextButton.click();

        // 等待新内容加载
        console.log('[WorkMode] 等待新内容加载...');
        await waitForElement(contentSelector);
        await new Promise(resolve => setTimeout(resolve, loadDelay));

        // 验证内容是否变化
        const newContent = document.querySelector(contentSelector);
        const newText = newContent?.textContent || '';

        if (newText === currentText) {
          throw new Error('内容未变化，可能已到最后一章');
        }

        console.log('[WorkMode] 新内容已加载');

        // 提取新章节内容
        const paragraphSelector = config?.content?.paragraphSelector || 'p';
        const newParagraphs = Array.from(newContent.querySelectorAll(paragraphSelector));
        console.log('[WorkMode] 提取到', newParagraphs.length, '个段落');

        const chapterTitle = extractChapterTitleFromDoc(document);

        // 追加到界面
        appendChapterContent(chapterTitle, newParagraphs);

        chapterState.loadedChapters.push(window.location.href);
        console.log('[WorkMode] 已加载章节:', chapterState.loadedChapters.length);

        // 检查是否还有下一章，并重新创建按钮
        const verificationDelay = config?.nextChapter?.verificationDelay || 100;
        setTimeout(() => {
          const stillHasNext = Array.from(document.querySelectorAll(buttonSelector)).some(btn =>
            btn.textContent.includes(buttonText)
          );

          if (stillHasNext) {
            const oldButton = document.getElementById('wps-load-next-btn');
            if (oldButton) oldButton.remove();
            createLoadNextButton();
          } else {
            updateLoadButtonState('finished');
            showMessage('已到最后一章');
          }
        }, verificationDelay);
      }

    } catch (error) {
      console.error('[WorkMode] 加载失败:', error);
      showMessage('加载失败：' + error.message);
      updateLoadButtonState('error');
    }

    chapterState.isLoading = false;
  }

})();

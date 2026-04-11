// WorkMode Content Script
// Press Alt+W to toggle WPS camouflage mode

(function() {
  'use strict';


  let isActive = false;
  let overlay = null;

  const chapterState = {
    loadedChapters: [],
    isLoading: false,
    lastFetchedHtml: null,      // 最后一次 fetch 的 HTML
    lastFetchedUrl: null,        // 最后一次 fetch 的 URL
    lastFetchedDoc: null         // 最后一次 fetch 的解析文档
  };

  // 立即注册快捷键监听器（不被 async 阻塞）
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.code === 'KeyW') {
      e.preventDefault();
      e.stopPropagation();
      toggleWorkMode();
    }
  }, true);

  async function toggleWorkMode() {
    if (isActive) {
      removeOverlay();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {});
      }
    } else {
      await createOverlay();
      document.documentElement.requestFullscreen().catch(err => {});
    }
    isActive = !isActive;
  }

  async function createOverlay() {
    // 获取配置
    const config = window.WorkModeConfigLoader?.getConfig();

    // 重置章节状态 - 每次重新激活 WorkMode 时都从当前页面开始
    chapterState.loadedChapters = [];
    chapterState.isLoading = false;
    chapterState.lastFetchedHtml = null;
    chapterState.lastFetchedUrl = null;  // 重要：清除旧的URL，使用当前页面
    chapterState.lastFetchedDoc = null;

    // 等待配置加载完成
    if (window.WorkModeConfigLoader && !window.WorkModeConfigLoader.ready) {
      await window.WorkModeConfigLoader.waitForReady();
    }

    if (overlay) {
      overlay.remove();
    }

    overlay = document.createElement('div');
    overlay.id = 'wps-overlay';
    overlay.className = 'active';

    // 隐藏原页面的滚动条
    document.body.style.overflow = 'hidden';

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

    // 添加用户 ID 显示
    const userIdDisplay = document.createElement('div');
    userIdDisplay.id = 'wps-user-id';
    userIdDisplay.title = '点击复制用户 ID';

    const userId = await WorkModeActivation.getUserId();
    const shortId = userId.substring(0, 8) + '...';
    userIdDisplay.textContent = `ID: ${shortId}`;

    // 点击：普通点击复制，Shift+点击重置激活状态
    userIdDisplay.addEventListener('click', (e) => {
      if (e.shiftKey) {
        // Shift+点击：重置激活状态（开发者调试功能）
        resetActivationState();
      } else {
        // 普通点击：复制用户 ID
        WorkModeActivation.copyUserId();
      }
    });

    toolbar.appendChild(userIdDisplay);

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
    // 检查配置是否支持下一章功能，或者直接检测晋江域名
    const hostname = window.location.hostname;
    const isJJWXC = hostname.includes('jjwxc.net');
    const supportsNextChapter = config?.nextChapter?.supported === true || isJJWXC;

    if (supportsNextChapter) {
      createLoadNextButton();
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
      // 恢复原页面的滚动条
      document.body.style.overflow = '';
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
        // Check if using <br> separator (like JJWXC)
        if (config.content.useBrSeparator) {
          const minParagraphLength = config.content.minParagraphLength || 1;
          const minParagraphCount = config.content.minParagraphCount || 10;

          // Check if we should only use the first element of a specific class
          let contentContainer = container;
          if (config.content.useFirstOfClass) {
            const firstElement = container.querySelector('.' + config.content.useFirstOfClass);
            if (firstElement) {
              contentContainer = firstElement;
            } else {
            }
          }

          // Get content HTML and clean it
          let html = contentContainer.innerHTML;

          // Create a temporary div to manipulate HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // 1. Exclude specific elements by ID
          if (config.content.excludeElementIds && Array.isArray(config.content.excludeElementIds)) {
            config.content.excludeElementIds.forEach(id => {
              const el = tempDiv.querySelector('#' + id);
              if (el) {
                el.remove();
              }
            });
          }

          // 1.5. Exclude specific elements by class
          if (config.content.excludeElementClasses && Array.isArray(config.content.excludeElementClasses)) {
            config.content.excludeElementClasses.forEach(cls => {
              const elements = tempDiv.querySelectorAll('.' + cls);
              if (elements.length > 0) {
                elements.forEach(el => el.remove());
              }
            });
          }

          // 2. Exclude content after specific text
          if (config.content.excludeAfterText) {
            const children = Array.from(tempDiv.children);
            let foundIndex = -1;

            for (let i = 0; i < children.length; i++) {
              if (children[i].textContent.includes(config.content.excludeAfterText)) {
                foundIndex = i;
                break;
              }
            }

            if (foundIndex >= 0) {
              // Remove elements from foundIndex onwards
              for (let i = tempDiv.children.length - 1; i >= foundIndex; i--) {
                tempDiv.children[i].remove();
              }
            }
          }

          // 3. Exclude specific tags
          if (config.content.excludeTags && Array.isArray(config.content.excludeTags)) {
            config.content.excludeTags.forEach(tag => {
              const tags = tempDiv.querySelectorAll(tag);
              if (tags.length > 0) {
                tags.forEach(t => t.remove());
              }
            });
          }

          html = tempDiv.innerHTML;

          // Split by <br>
          const parts = html.split(/<br\s*\/?>/i);

          // Create virtual paragraph elements
          const paragraphs = parts.map((part, index) => {
            const p = document.createElement('p');
            p.innerHTML = part.trim();
            p.dataset.brIndex = index; // Mark as br-separated
            return p;
          }).filter((p, index) => {
            const text = p.textContent.trim();
            // 跳过看起来像纯标题的短段落（没有章节号）
            // JJWXC 的第一个段落通常是纯标题，如"说好的同伴爱呢"
            if (index === 0 && text.length < 50 && !/^第\d+章/.test(text) && !text.includes('，')) {
              return false;
            }
            return text.length >= minParagraphLength && !hasExcludeKeyword(text);
          });

          if (paragraphs.length >= minParagraphCount) {
            return paragraphs;
          }
        } else {
          // Original paragraph selector mode
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

        // 起点格式: "第1章 牛顿的感谢 _《书名》小说在线阅读 - 起点中文网"
        const qidianMatch = titleText.match(/^(第\d+章\s+[^_《]+?)(?=_|《|$)/);
        if (qidianMatch) {
          const title = qidianMatch[1].trim();
          return title;
        }

        // 晋江格式: "第一章 章节标题 _ 小说名 _ 晋江文学城"
        const jjwxcMatch = titleText.match(/^(第[零一二三四五六七八九十百千0-9]+章\s+[^_]+)/);
        if (jjwxcMatch) {
          const title = jjwxcMatch[1].trim();
          return title;
        }

        // 番茄格式: "我不是戏神第1章 截鬼回家在线免费阅读_番茄小说官网"
        const fanqieMatch = titleText.match(/(第\d+章\s+.*?)(?=在线|免费|阅读|_|$)/);
        if (fanqieMatch) {
          const title = fanqieMatch[1].trim();
          return title;
        }

        // 如果上面都失败，尝试简单匹配
        const simpleMatch = titleText.match(/(第[零一二三四五六七八九十百千0-9]+章\s+[\u4e00-\u9fa5]+)/);
        if (simpleMatch) {
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
            return titleText;
          } else {
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
          return titleText;
        } else {
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

          // 从 meta 内容中提取章节名
          const chapterMatch = metaText.match(/第\d+章\s+[^,_\s]{1,30}/);
          if (chapterMatch) {
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
      separator.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  // 加载下一章 - 支持 SPA 和 MPA 两种模式
  async function loadNextChapter() {
    // 检查激活状态
    if (!await WorkModeActivation.isActivated()) {
      // 退出全屏，否则用户看不到激活弹窗
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(err => {});
      }

      // 显示激活弹窗，传入成功回调
      WorkModeActivation.showActivationDialog(false, async () => {
        // 激活成功后的回调：进入全屏并自动加载下一章
        // 进入全屏（WorkMode 的正常使用状态）
        document.documentElement.requestFullscreen().catch(err => {});
        // 重新调用 loadNextChapter，这次会跳过激活检查直接加载
        await loadNextChapter();
      });
      return;
    }

    if (chapterState.isLoading) return;

    const config = window.WorkModeConfigLoader?.getConfig();

    chapterState.isLoading = true;
    updateLoadButtonState('loading');

    try {

      const method = config?.nextChapter?.method || 'click';
      const buttonSelector = config?.nextChapter?.buttonSelector || 'button';
      const buttonText = config?.nextChapter?.buttonText || '下一章';
      const contentSelector = config?.nextChapter?.contentSelector || '.muye-reader-content';
      const loadDelay = config?.nextChapter?.loadDelay || 500;

      if (method === 'fetch') {
        // MPA 模式：使用 fetch 获取下一页内容

        let nextUrl;

        // 检查是否配置了 URL 参数递增模式（如晋江的 chapterid）
        const urlParam = config?.nextChapter?.urlParam;
        if (urlParam) {

          // 获取当前 URL（优先使用上次 fetch 的 URL）
          const currentUrl = chapterState.lastFetchedUrl || window.location.href;

          // 解析 URL，提取并递增参数
          const urlObj = new URL(currentUrl);
          const currentChapterId = urlObj.searchParams.get(urlParam);

          if (currentChapterId) {
            const nextChapterId = parseInt(currentChapterId) + 1;
            urlObj.searchParams.set(urlParam, nextChapterId.toString());
            nextUrl = urlObj.href;
          } else {
            throw new Error('URL 中未找到参数: ' + urlParam);
          }
        } else {
          // 传统模式：从页面查找"下一章"链接

          // 确定从哪个文档查找"下一章"链接
          const sourceDoc = chapterState.lastFetchedDoc || document;
          if (chapterState.lastFetchedUrl) {
          }

          // 找到"下一章"链接
          let nextButton = Array.from(sourceDoc.querySelectorAll(buttonSelector)).find(btn =>
            btn.textContent.trim() === buttonText
          );

          if (!nextButton) {
            nextButton = Array.from(sourceDoc.querySelectorAll(buttonSelector)).find(btn =>
              btn.textContent.includes(buttonText) && btn.textContent.trim().length < 20
            );
          }

          if (!nextButton) {
            throw new Error('未找到"' + buttonText + '"链接');
          }

          nextUrl = nextButton.href;
        }


        if (!nextUrl) {
          throw new Error('无法获取下一章 URL');
        }

        // 检查是否重复加载
        if (chapterState.loadedChapters.includes(nextUrl)) {
          throw new Error('下一章已加载，可能已到最后一章');
        }

        // 获取下一页 HTML
        const response = await fetch(nextUrl);
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        // 获取原始字节
        const buffer = await response.arrayBuffer();
        let html = '';

        // 检查响应头中的编码
        const contentType = response.headers.get('content-type');

        // 尝试从 HTML 中检测编码
        const decoder = new TextDecoder('utf-8');
        const preview = decoder.decode(buffer.slice(0, 1024));

        // 检测 charset
        let charset = 'utf-8';
        const charsetMatch = preview.match(/charset=["']?([^"'\s>]+)/i);
        if (charsetMatch) {
          charset = charsetMatch[1].toLowerCase();
        }

        // 根据 charset 选择解码器
        if (charset === 'gbk' || charset === 'gb2312' || charset === 'gb18030') {
          try {
            const gbkDecoder = new TextDecoder('gbk');
            html = gbkDecoder.decode(buffer);
          } catch (e) {
            html = decoder.decode(buffer);
          }
        } else {
          html = decoder.decode(buffer);
        }

        const parser = new DOMParser();
        const newDoc = parser.parseFromString(html, 'text/html');


        // 从新页面提取内容 - 支持多种选择器回退
        let newContent = newDoc.querySelector(contentSelector);

        // 如果主选择器失败，尝试备用选择器
        if (!newContent) {
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
              if (pCount >= 5 && textLen > 200) {
                newContent = el;
                break;
              }
            }
          }
        }

        if (!newContent) {
          // 最后尝试：直接查找所有段落，找最可能的容器
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
          } else {
            throw new Error('无法在页面中找到内容区域，可能页面结构已更改或需要登录');
          }
        }

        // Extract paragraphs based on config
        let newParagraphs = [];

        if (config?.content?.useBrSeparator) {
          // Use <br> separator mode (for JJWXC, etc.)

          // Check if we should only use the first element of a specific class
          let contentContainer = newContent;
          if (config.content.useFirstOfClass) {
            const firstElement = newContent.querySelector('.' + config.content.useFirstOfClass);
            if (firstElement) {
              contentContainer = firstElement;
            }
          }

          let html = contentContainer.innerHTML;

          // Check if we need to exclude content after a specific ID
          // Create a temporary div to manipulate HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // 1. Exclude specific elements by ID
          if (config.content.excludeElementIds && Array.isArray(config.content.excludeElementIds)) {
            config.content.excludeElementIds.forEach(id => {
              const el = tempDiv.querySelector('#' + id);
              if (el) {
                el.remove();
              }
            });
          }

          // 1.5. Exclude specific elements by class
          if (config.content.excludeElementClasses && Array.isArray(config.content.excludeElementClasses)) {
            config.content.excludeElementClasses.forEach(cls => {
              const elements = tempDiv.querySelectorAll('.' + cls);
              if (elements.length > 0) {
                elements.forEach(el => el.remove());
              }
            });
          }

          // 2. Exclude content after specific text
          if (config.content.excludeAfterText) {
            const children = Array.from(tempDiv.children);
            let foundIndex = -1;

            for (let i = 0; i < children.length; i++) {
              if (children[i].textContent.includes(config.content.excludeAfterText)) {
                foundIndex = i;
                break;
              }
            }

            if (foundIndex >= 0) {
              for (let i = tempDiv.children.length - 1; i >= foundIndex; i--) {
                tempDiv.children[i].remove();
              }
            }
          }

          // 3. Exclude specific tags
          if (config.content.excludeTags && Array.isArray(config.content.excludeTags)) {
            config.content.excludeTags.forEach(tag => {
              const tags = tempDiv.querySelectorAll(tag);
              if (tags.length > 0) {
                tags.forEach(t => t.remove());
              }
            });
          }

          // 3.5. Smart link handling: Remove all <a> tags except "next chapter" links
          const allLinks = tempDiv.querySelectorAll('a');
          let removedCount = 0;
          allLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent.trim();
            // Keep only links that look like "next chapter" links
            const isNextChapterLink = href.includes('nextchapter') ||
                                     href.includes('next') ||
                                     text.includes('下一章') ||
                                     text.includes('下页');
            if (!isNextChapterLink) {
              link.remove();
              removedCount++;
            }
          });
          if (removedCount > 0) {
          }

          html = tempDiv.innerHTML;

          const parts = html.split(/<br\s*\/?>/i);

          newParagraphs = parts.map((part, index) => {
            const p = document.createElement('p');
            p.innerHTML = part.trim();
            p.dataset.brIndex = index;
            return p;
          }).filter((p, index) => {
            const text = p.textContent.trim();
            // 跳过看起来像纯标题的短段落（没有章节号）
            if (index === 0 && text.length < 50 && !/^第\d+章/.test(text) && !text.includes('，')) {
              return false;
            }
            return text.length >= 1;
          });
        } else {
          // Original paragraph selector mode
          const paragraphSelector = config?.content?.paragraphSelector || 'p';
          newParagraphs = Array.from(newContent.querySelectorAll(paragraphSelector));
        }


        // 显示前3段内容预览（用于诊断）
        for (let i = 0; i < Math.min(3, newParagraphs.length); i++) {
          const text = newParagraphs[i].textContent.trim();
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
            updateLoadButtonState('finished');
            showMessage('已到最后一章');
            chapterState.isLoading = false;
            return;
          }
        }

        // 提取章节标题
        const chapterTitle = extractChapterTitleFromDoc(newDoc);

        // 检查标题是否异常长（可能包含了正文）
        if (chapterTitle.length > 100) {
        }

        // 追加到界面
        appendChapterContent(chapterTitle, newParagraphs);

        chapterState.loadedChapters.push(nextUrl);

        // 保存最后一次 fetch 的信息，用于下一次查找"下一章"链接
        chapterState.lastFetchedUrl = nextUrl;
        chapterState.lastFetchedHtml = html;
        chapterState.lastFetchedDoc = newDoc;

        // 移除旧按钮，创建新按钮
        const oldButton = document.getElementById('wps-load-next-btn');
        if (oldButton) oldButton.remove();
        createLoadNextButton();
        updateLoadButtonState('normal');

      } else {
        // SPA 模式：点击按钮，等待内容原地变化

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
        nextButton.click();

        // 等待新内容加载
        await waitForElement(contentSelector);
        await new Promise(resolve => setTimeout(resolve, loadDelay));

        // 验证内容是否变化
        const newContent = document.querySelector(contentSelector);
        const newText = newContent?.textContent || '';

        if (newText === currentText) {
          throw new Error('内容未变化，可能已到最后一章');
        }


        // 提取新章节内容
        let newParagraphs = [];

        if (config?.content?.useBrSeparator) {
          // Use <br> separator mode
          let html = newContent.innerHTML;

          // Check if we need to exclude content after a specific ID
          // Create a temporary div to manipulate HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          // 1. Exclude specific elements by ID
          if (config.content.excludeElementIds && Array.isArray(config.content.excludeElementIds)) {
            config.content.excludeElementIds.forEach(id => {
              const el = tempDiv.querySelector('#' + id);
              if (el) {
                el.remove();
              }
            });
          }

          // 1.5. Exclude specific elements by class
          if (config.content.excludeElementClasses && Array.isArray(config.content.excludeElementClasses)) {
            config.content.excludeElementClasses.forEach(cls => {
              const elements = tempDiv.querySelectorAll('.' + cls);
              if (elements.length > 0) {
                elements.forEach(el => el.remove());
              }
            });
          }

          // 2. Exclude content after specific text
          if (config.content.excludeAfterText) {
            const children = Array.from(tempDiv.children);
            let foundIndex = -1;

            for (let i = 0; i < children.length; i++) {
              if (children[i].textContent.includes(config.content.excludeAfterText)) {
                foundIndex = i;
                break;
              }
            }

            if (foundIndex >= 0) {
              for (let i = tempDiv.children.length - 1; i >= foundIndex; i--) {
                tempDiv.children[i].remove();
              }
            }
          }

          // 3. Exclude specific tags
          if (config.content.excludeTags && Array.isArray(config.content.excludeTags)) {
            config.content.excludeTags.forEach(tag => {
              const tags = tempDiv.querySelectorAll(tag);
              if (tags.length > 0) {
                tags.forEach(t => t.remove());
              }
            });
          }

          // 3.5. Smart link handling: Remove all <a> tags except "next chapter" links
          const allLinks = tempDiv.querySelectorAll('a');
          let removedCount = 0;
          allLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent.trim();
            // Keep only links that look like "next chapter" links
            const isNextChapterLink = href.includes('nextchapter') ||
                                     href.includes('next') ||
                                     text.includes('下一章') ||
                                     text.includes('下页');
            if (!isNextChapterLink) {
              link.remove();
              removedCount++;
            }
          });
          if (removedCount > 0) {
          }

          html = tempDiv.innerHTML;

          const parts = html.split(/<br\s*\/?>/i);

          newParagraphs = parts.map((part, index) => {
            const p = document.createElement('p');
            p.innerHTML = part.trim();
            p.dataset.brIndex = index;
            return p;
          }).filter((p, index) => {
            const text = p.textContent.trim();
            // 跳过看起来像纯标题的短段落（没有章节号）
            if (index === 0 && text.length < 50 && !/^第\d+章/.test(text) && !text.includes('，')) {
              return false;
            }
            return text.length >= 1;
          });
        } else {
          // Original paragraph selector mode
          const paragraphSelector = config?.content?.paragraphSelector || 'p';
          newParagraphs = Array.from(newContent.querySelectorAll(paragraphSelector));
        }


        const chapterTitle = extractChapterTitleFromDoc(document);

        // 追加到界面
        appendChapterContent(chapterTitle, newParagraphs);

        chapterState.loadedChapters.push(window.location.href);

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

  // 重置激活状态（开发者调试功能）
  async function resetActivationState() {
    if (confirm('确定要重置激活状态吗？\n\n重置后需要重新输入激活码才能使用"下一章"功能。')) {
      try {
        await chrome.storage.local.remove(['isActivated', 'activationCode']);
        console.log('[WorkMode] 激活状态已重置');

        // 更新工具栏用户 ID 显示提示已重置
        const userIdDisplay = document.getElementById('wps-user-id');
        if (userIdDisplay) {
          const userId = await WorkModeActivation.getUserId();
          const shortId = userId.substring(0, 8) + '...';
          userIdDisplay.textContent = `ID: ${shortId} (已重置)`;
          setTimeout(() => {
            userIdDisplay.textContent = `ID: ${shortId}`;
          }, 2000);
        }

        showToast('激活状态已重置');
      } catch (error) {
        console.error('[WorkMode] 重置激活状态失败:', error);
        showToast('重置失败：' + error.message);
      }
    }
  }

})();

# Platform Configuration Guide

This guide explains how to add support for new novel platforms to WorkMode using JSON configuration files.

## How to Add a New Novel Platform

### Step 1: Identify Selectors

Use browser DevTools to find:
- Content container CSS selector (where chapter text is located)
- Paragraph element selector (usually `p`)
- "Next Chapter" button selector and text
- Chapter title format in page text

**Example DevTools workflow:**
1. Open the novel website
2. Press F12 to open DevTools
3. Use the Element Inspector (Ctrl+Shift+C) to click on the content area
4. Note the CSS class or ID of the content container
5. Find the "下一章" button and note its selector

### Step 2: Create Config File

Create a new JSON file in `dist/platform-configs/yourplatform.json`:

```json
{
  "domains": ["example.com", "www.example.com", "m.example.com"],
  "name": "平台名称",
  "content": {
    "selector": ".content-class",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "method": "click",
    "buttonSelector": "button",
    "buttonText": "下一章",
    "contentSelector": ".content-class",
    "loadDelay": 500,
    "verificationDelay": 100
  },
  "chapterTitle": {
    "regex": "第(\\d+)章\\s+(.+)",
    "format": "第{chapter}章 {title}",
    "fallback": "未知章节"
  },
  "excludeKeywords": [
    "广告",
    "VIP",
    "cookie",
    "隐私政策"
  ]
}
```

### Configuration Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `domains` | array | List of domain names this config applies to |
| `name` | string | Platform display name |
| `content.selector` | string | CSS selector for content container |
| `content.paragraphSelector` | string | CSS selector for paragraph elements |
| `content.minParagraphCount` | number | Minimum paragraphs to validate content |
| `content.minParagraphLength` | number | Minimum characters per paragraph |
| `nextChapter.supported` | boolean | Whether platform supports continuous loading (default: true) |
| `nextChapter.reason` | string | Reason if supported is false (e.g., "SPA架构") |
| `nextChapter.method` | string | Method to load next chapter (currently only "click") |
| `nextChapter.buttonSelector` | string | CSS selector for next chapter button |
| `nextChapter.buttonText` | string | Text content to identify the button |
| `nextChapter.contentSelector` | string | CSS selector for content area to monitor |
| `nextChapter.loadDelay` | number | Milliseconds to wait after clicking button |
| `nextChapter.verificationDelay` | number | Milliseconds before checking for next button |
| `chapterTitle.regex` | string | Regex pattern to extract chapter title |
| `chapterTitle.format` | string | Format template with {chapter} and {title} placeholders |
| `chapterTitle.fallback` | string | Default text when title extraction fails |
| `excludeKeywords` | array | Keywords to filter out from content |

### Step 3: Register Config

Add your config file to `dist/config-loader.js`:

```javascript
async loadAllConfigs() {
  const configFiles = [
    'platform-configs/fanqienovel.json',
    'platform-configs/qidian.json',
    'platform-configs/yourplatform.json'  // Add your config here
  ];

  for (const file of configFiles) {
    try {
      const url = chrome.runtime.getURL(file);
      const response = await fetch(url);
      const config = await response.json();
      this.registerConfig(config);
      console.log('[WorkMode] Loaded config:', config.name);
    } catch (e) {
      console.warn('[WorkMode] Failed to load config:', file, e);
    }
  }
}
```

### Step 4: Test

1. **Reload the extension:**
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Click the reload button on WorkMode

2. **Visit the target platform:**
   - Navigate to a chapter page on the platform
   - Open DevTools Console (F12)

3. **Verify config loading:**
   - Look for log message: `[WorkMode] Loaded config: 平台名称`
   - Look for log message: `[WorkMode] Using config: 平台名称 for example.com`

4. **Test WorkMode:**
   - Press Alt+W to activate
   - Verify content displays correctly
   - Check chapter title is extracted
   - If "下一章" button exists, test next chapter loading

5. **Debug if issues occur:**
   - Open DevTools Console for error messages
   - Use Inspector to verify selectors are correct
   - Check that content has enough paragraphs (minParagraphCount)
   - Verify chapter title regex matches the page format

## Common Issues

### Content Not Displaying

**Symptom:** WorkMode activates but shows "无法提取页面内容"

**Possible causes:**
1. Content selector is incorrect
2. Paragraphs are too short (below minParagraphLength)
3. Not enough paragraphs (below minParagraphCount)
4. Content is filtered by excludeKeywords

**Solution:**
1. Verify selector using DevTools Inspector
2. Temporarily reduce minParagraphCount to 1 for testing
3. Check console for filtered keywords

### Next Chapter Button Not Showing

**Symptom:** "加载下一章" button doesn't appear

**Possible causes:**
1. Button selector is incorrect
2. Button text doesn't match buttonText
3. Website doesn't have a next chapter button

**Solution:**
1. Use DevTools to find actual button selector
2. Check exact button text (including spaces)
3. Some sites may use links (`<a>`) instead of buttons

### Chapter Title Not Extracting

**Symptom:** Shows "未知章节" instead of actual title

**Possible causes:**
1. Regex pattern doesn't match page format
2. Title is in a different location

**Solution:**
1. Check page source for title format
2. Adjust regex pattern to match
3. Test regex in browser console: `document.body.textContent.match(/your_pattern/)`

## Example Configurations

### Tomato Novel (番茄小说)

```json
{
  "domains": ["fanqienovel.com", "m.fanqienovel.com"],
  "name": "番茄小说",
  "content": {
    "selector": ".muye-reader-content",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "supported": true,
    "method": "click",
    "buttonSelector": "button",
    "buttonText": "下一章",
    "contentSelector": ".muye-reader-content",
    "loadDelay": 500,
    "verificationDelay": 100
  },
  "chapterTitle": {
    "regex": "第(\\d+)章\\s*([^\\n]{1,30}?)(?:\\s*本章字数)",
    "format": "第{chapter}章 {title}",
    "fallback": "未知章节"
  }
}
```

**Note:** Tomato Novel uses AJAX loading. Click "下一章" button (`<button>` element) triggers dynamic content update without page navigation.

### Qidian (起点中文网)

```json
{
  "domains": ["qidian.com", "m.qidian.com", "www.qidian.com"],
  "name": "起点中文网",
  "content": {
    "selector": ".read-content",
    "paragraphSelector": "p",
    "minParagraphCount": 10,
    "minParagraphLength": 1
  },
  "nextChapter": {
    "supported": true,
    "method": "click",
    "buttonSelector": "button",
    "buttonText": "下一章",
    "contentSelector": ".read-content",
    "loadDelay": 800,
    "verificationDelay": 200
  },
  "chapterTitle": {
    "regex": "第(\\d+)章\\s+([^_《]{1,30})",
    "format": "第{chapter}章 {title}",
    "fallback": "未知章节"
  },
  "excludeKeywords": [
    "扫一扫", "手机接着看", "扫码阅读", "APP下载"
  ]
}
```

**Note:** Uses same AJAX method as Tomato Novel. Click "下一章" button triggers dynamic content update. Longer `loadDelay` (800ms) for slower content loading.
## Testing Checklist

- [ ] Config file created in `dist/platform-configs/`
- [ ] Config registered in `config-loader.js`
- [ ] Extension reloaded
- [ ] Config loads without errors (check console)
- [ ] Content displays correctly
- [ ] Chapter title extracts correctly
- [ ] Next chapter button appears (if `supported: true`)
- [ ] Next chapter loading works correctly
- [ ] Special fonts preserved (for novel sites)
- [ ] No console errors during operation

**Note:** Most novel platforms (番茄小说, 起点中文网) use AJAX loading and support continuous chapter loading.
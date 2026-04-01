// Config Loader for WorkMode Platform Adaptation
(function() {
  'use strict';

  const ConfigLoader = {
    configs: {},
    currentConfig: null,

    // Load all platform configs
    async loadAllConfigs() {
      const configFiles = [
        'platform-configs/fanqienovel.json',
        'platform-configs/qidian.json',
        'platform-configs/jjwxc.json'
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
    },

    // Register a platform config
    registerConfig(config) {
      config.domains.forEach(domain => {
        this.configs[domain] = config;
      });
    },

    // Get config for current page
    getConfigForPage() {
      const hostname = window.location.hostname;
      // Check for exact match or subdomain match
      for (const domain in this.configs) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          this.currentConfig = this.configs[domain];
          console.log('[WorkMode] Using config:', this.currentConfig.name, 'for', hostname);
          return this.currentConfig;
        }
      }
      console.log('[WorkMode] No specific config found for', hostname + ', using fallback');
      // 没有找到匹配的配置，使用回退配置并设置 currentConfig
      this.currentConfig = this.getFallbackConfig();
      return this.currentConfig;
    },

    // Get config (returns current or fallback)
    getConfig() {
      return this.currentConfig || this.getFallbackConfig();
    },

    // Fallback config for generic sites
    getFallbackConfig() {
      return {
        content: {
          selector: null, // Try all selectors
          "paragraphSelector": "p",
          "minParagraphCount": 10,
          "minParagraphLength": 1
        },
        "nextChapter": {
          "supported": true,
          "method": "click",
          "buttonSelector": "button",
          "buttonText": "下一章",
          "contentSelector": null,
          "loadDelay": 500,
          "verificationDelay": 100
        },
        "chapterTitle": {
          "regex": "第(\\d+)章\\s+([^\\n]+)",
          "format": "第{chapter}章 {title}",
          "fallback": "未知章节"
        },
        "excludeKeywords": [
          "cookie",
          "隐私政策",
          "服务条款",
          "copyright",
          "©"
        ]
      };
    }
  };

  window.WorkModeConfigLoader = ConfigLoader;

  // 自动加载所有配置
  ConfigLoader.loadAllConfigs().then(() => {
    console.log('[WorkMode] ConfigLoader initialization complete');
    ConfigLoader.getConfigForPage(); // 预加载当前页面配置
  }).catch(err => {
    console.error('[WorkMode] ConfigLoader initialization failed:', err);
  });
})();

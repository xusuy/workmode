// dist/activation/activation.js
// 激活系统核心模块

(function() {
  'use strict';

  // 固定私钥（生产环境应进一步混淆）
  const SECRET_SALT = "WorkMode_Pro_2026_Shadow";

  // 存储键名
  const STORAGE_KEYS = {
    USER_ID: 'userId',
    IS_ACTIVATED: 'isActivated',
    ACTIVATION_CODE: 'activationCode',
    FIRST_LAUNCH_SHOWN: 'firstLaunchShown'
  };

  // 生成用户唯一 ID
  function generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  }

  // 存储操作封装
  const Storage = {
    async get(key) {
      const result = await chrome.storage.local.get(key);
      return result[key];
    },

    async set(data) {
      await chrome.storage.local.set(data);
    }
  };

  // 计算正确的激活码
  function calculateActivationCode(userId) {
    const hash = window.WorkModeMD5(userId + SECRET_SALT);
    return hash.substring(0, 8).toUpperCase();
  }

  // 显示 Toast 提示
  function showToast(message, duration = 2000) {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.wps-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'wps-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('wps-toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // 核心 API
  const WorkModeActivation = {
    // 获取或生成用户唯一 ID
    async getUserId() {
      let id = await Storage.get(STORAGE_KEYS.USER_ID);
      if (!id) {
        id = generateUserId();
        await Storage.set({ [STORAGE_KEYS.USER_ID]: id });
        console.log('[WorkMode] 生成新用户 ID:', id);
      }
      return id;
    },

    // 检查是否已激活
    async isActivated() {
      return await Storage.get(STORAGE_KEYS.IS_ACTIVATED) === true;
    },

    // 验证激活码
    async verifyActivation(inputCode) {
      try {
        console.log('[WorkMode] 开始验证激活码:', inputCode);
        const userId = await this.getUserId();
        console.log('[WorkMode] 用户 ID:', userId);

        const correctCode = calculateActivationCode(userId);
        console.log('[WorkMode] 正确的激活码:', correctCode);
        console.log('[WorkMode] 用户输入:', inputCode.toUpperCase());

        if (inputCode.toUpperCase() === correctCode) {
          await Storage.set({
            [STORAGE_KEYS.IS_ACTIVATED]: true,
            [STORAGE_KEYS.ACTIVATION_CODE]: inputCode.toUpperCase()
          });
          console.log('[WorkMode] 激活成功');
          return true;
        }

        console.log('[WorkMode] 激活失败：激活码不正确');
        return false;
      } catch (error) {
        console.error('[WorkMode] 激活验证出错:', error);
        throw error;
      }
    },

    // 检查是否已显示过首次激活弹窗
    async isFirstLaunch() {
      return await Storage.get(STORAGE_KEYS.FIRST_LAUNCH_SHOWN) !== true;
    },

    // 标记首次弹窗已显示
    async markFirstLaunchShown() {
      await Storage.set({ [STORAGE_KEYS.FIRST_LAUNCH_SHOWN]: true });
    },

    // 显示激活弹窗
    showActivationDialog(isFirstTime = true) {
      // 移除已存在的弹窗
      const existing = document.getElementById('activation-modal');
      if (existing) {
        existing.remove();
      }

      const modal = document.createElement('div');
      modal.id = 'activation-modal';
      modal.className = 'activation-modal';

      const title = isFirstTime ? '欢迎使用 WorkMode' : '该功能需要激活';
      const dialog = `
        <div class="activation-dialog">
          <h3>${title}</h3>
          <p>解锁专业版：<br>支持翻页和更多功能<br>及开发者持续更新维护。</p>

          <div class="user-id-section">
            <label>您的用户 ID:</label>
            <div class="user-id-row">
              <code id="activation-user-id">加载中...</code>
              <button id="copy-user-id-btn" class="icon-btn" title="复制">📋</button>
            </div>
            <small>支付时请将此 ID 发给开发者</small>
          </div>

          <div class="input-section">
            <label for="activation-code">激活码:</label>
            <input type="text" id="activation-code" maxlength="8" placeholder="输入 8 位激活码" autocomplete="off">
            <span id="activation-error" class="error-msg"></span>
          </div>

          <div class="payment-info">
            <div class="payment-divider"></div>
            <div class="payment-item">
              <span class="icon">🟢</span>
              <span>加绿泡泡 <strong>jycc1024666</strong></span>
            </div>
            <div class="payment-item">
              <span>发送 ID 即可获取永久激活码</span>
            </div>
            <div class="payment-price">
              <span class="icon">💰</span>
              <strong>19.9 元 / 永久</strong>
            </div>
            <div class="payment-time">
              <span class="icon">⏰</span>
              <span>人工发码，在线时间 9:00-23:00</span>
            </div>
          </div>

          <div class="button-group">
            <button id="activation-cancel" class="btn-secondary">取消</button>
            <button id="activation-submit" class="btn-primary">激活</button>
          </div>
        </div>
      `;

      modal.innerHTML = dialog;
      document.body.appendChild(modal);

      // 异步加载并显示用户 ID
      this.getUserId().then(userId => {
        const userIdEl = document.getElementById('activation-user-id');
        if (userIdEl) {
          userIdEl.textContent = userId;
        }
      });

      // 绑定事件
      const copyBtn = document.getElementById('copy-user-id-btn');
      const cancelBtn = document.getElementById('activation-cancel');
      const submitBtn = document.getElementById('activation-submit');
      const input = document.getElementById('activation-code');
      const errorEl = document.getElementById('activation-error');

      // 复制用户 ID
      copyBtn.addEventListener('click', async () => {
        const userId = await this.getUserId();
        await navigator.clipboard.writeText(userId);
        showToast('用户 ID 已复制');
      });

      // 取消
      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });

      // 激活
      submitBtn.addEventListener('click', async () => {
        const code = input.value.trim();
        errorEl.textContent = '';

        if (!code) {
          errorEl.textContent = '请输入激活码';
          input.classList.add('error');
          return;
        }

        if (code.length !== 8) {
          errorEl.textContent = '激活码应为 8 位';
          input.classList.add('error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '验证中...';

        try {
          const success = await this.verifyActivation(code);

          if (success) {
            showToast('激活成功！');
            setTimeout(() => {
              modal.remove();
              // 通知调用方激活成功
              if (window._onActivationSuccess) {
                window._onActivationSuccess();
              }
            }, 500);
          } else {
            errorEl.textContent = '激活码不正确，请检查';
            input.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = '激活';
          }
        } catch (error) {
          console.error('[WorkMode] 激活过程出错:', error);
          errorEl.textContent = '激活失败，请重试';
          input.classList.add('error');
          submitBtn.disabled = false;
          submitBtn.textContent = '激活';
        }
      });

      // 输入时清除错误状态
      input.addEventListener('input', () => {
        input.classList.remove('error');
        errorEl.textContent = '';
      });

      // 点击遮罩关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    },

    // 复制用户 ID 到剪贴板（供工具栏调用）
    async copyUserId() {
      const userId = await this.getUserId();
      await navigator.clipboard.writeText(userId);
      showToast('用户 ID 已复制');
    }
  };

  // 导出到全局
  window.WorkModeActivation = WorkModeActivation;
})();

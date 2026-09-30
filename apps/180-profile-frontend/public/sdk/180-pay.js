/**
 * 180 Pay Sovereign Vault & Gateway Client Embed SDK (v2.0.0)
 * Fast, secure, zero-dependency payment & subscription checkout embed SDK.
 *
 * Usage:
 * <script src="https://profile.180workspace.com/sdk/180-pay.js"></script>
 * <script>
 *   OneEightyPay.openCheckout({
 *     sessionId: 'cs_live_...',
 *     uxMode: 'bottom_sheet', // 'bottom_sheet' | 'modal' | 'popup' | 'redirect'
 *     onSuccess: function(data) {
 *       console.log('Payment Successful!', data);
 *       window.location.reload();
 *     },
 *     onCancel: function() { console.log('Checkout dismissed'); }
 *   });
 * </script>
 */
(function (global) {
  'use strict';

  var DEFAULT_CHECKOUT_BASE = 'http://localhost:3009';
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname.endsWith('180workspace.com')) {
      DEFAULT_CHECKOUT_BASE = 'https://profile.180workspace.com';
    } else if (window.location.protocol === 'https:') {
      DEFAULT_CHECKOUT_BASE = 'https://profile.180workspace.com';
    }
  }

  var activeModalContainer = null;

  var OneEightyPay = {
    version: '2.0.0',

    /**
     * Open 180 Pay Sovereign Checkout Drawer / Modal / Popup
     * @param {Object} options
     * @returns {Promise<Object>} Resolves on payment success
     */
    openCheckout: function (options) {
      options = options || {};
      var sessionId = options.sessionId;
      if (!sessionId) {
        var err = new Error('[180 Pay] Missing required option: sessionId');
        if (options.onError) options.onError(err);
        return Promise.reject(err);
      }

      var uxMode = options.uxMode || 'bottom_sheet';
      var baseUrl = options.checkoutServerUrl || DEFAULT_CHECKOUT_BASE;
      var checkoutUrl = baseUrl + '/checkout/' + encodeURIComponent(sessionId);

      // Handle Full Page Redirect
      if (uxMode === 'redirect' || uxMode === 'full_page') {
        window.location.href = checkoutUrl;
        return Promise.resolve({ redirected: true });
      }

      // Handle Popup Window
      if (uxMode === 'popup') {
        return this._openPopup(checkoutUrl, sessionId, options);
      }

      // Handle In-App Bottom Sheet or Centered Modal
      return this._openIframeOverlay(checkoutUrl, sessionId, uxMode, options);
    },

    /**
     * Internal: Open Popup Window
     */
    _openPopup: function (url, sessionId, options) {
      var width = 480;
      var height = 720;
      var left = (window.screen.width - width) / 2;
      var top = (window.screen.height - height) / 2;

      var popup = window.open(
        url,
        '180_pay_checkout_' + sessionId,
        'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',scrollbars=yes,status=no,toolbar=no,resizable=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        if (options.onError) {
          options.onError(new Error('[180 Pay] Popup blocked by browser. Please allow popups for payment.'));
        }
        return Promise.reject(new Error('Popup blocked'));
      }

      return new Promise(function (resolve, reject) {
        var isResolved = false;

        var messageListener = function (event) {
          if (!event.data || (event.data.type !== '180_PAYMENT_SUCCESS' && event.data.type !== '180_PAYMENT_CLOSE')) {
            return;
          }

          if (event.data.type === '180_PAYMENT_SUCCESS') {
            isResolved = true;
            window.removeEventListener('message', messageListener);
            clearInterval(pollTimer);
            if (options.onSuccess) options.onSuccess(event.data);
            resolve(event.data);
          } else if (event.data.type === '180_PAYMENT_CLOSE') {
            window.removeEventListener('message', messageListener);
            clearInterval(pollTimer);
            if (!isResolved && options.onCancel) options.onCancel();
            resolve({ cancelled: true });
          }
        };

        window.addEventListener('message', messageListener);

        var pollTimer = setInterval(function () {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', messageListener);
            if (!isResolved) {
              if (options.onCancel) options.onCancel();
              resolve({ cancelled: true });
            }
          }
        }, 500);
      });
    },

    /**
     * Internal: Open Bottom Sheet or Modal with Iframe
     */
    _openIframeOverlay: function (url, sessionId, uxMode, options) {
      if (activeModalContainer) {
        this.close();
      }

      var isBottomSheet = uxMode === 'bottom_sheet';

      // 1. Overlay Backdrop
      var backdrop = document.createElement('div');
      backdrop.id = 'one-eighty-pay-backdrop';
      backdrop.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 9999999',
        'background: rgba(9, 9, 11, 0.65)',
        'backdrop-filter: blur(8px)',
        '-webkit-backdrop-filter: blur(8px)',
        'display: flex',
        'align-items: ' + (isBottomSheet ? 'flex-end' : 'center'),
        'justify-content: center',
        'opacity: 0',
        'transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      ].join(';');

      // 2. Drawer / Modal Container
      var drawer = document.createElement('div');
      drawer.id = 'one-eighty-pay-drawer';
      
      var drawerBaseStyles = [
        'position: relative',
        'width: 100%',
        'background: #ffffff',
        'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        'overflow: hidden',
        'transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      ];

      if (isBottomSheet) {
        drawerBaseStyles.push(
          'max-width: 520px',
          'height: min(85vh, 740px)',
          'border-top-left-radius: 28px',
          'border-top-right-radius: 28px',
          'border-top: 1px solid rgba(255, 255, 255, 0.2)',
          'transform: translateY(100%)'
        );
      } else {
        drawerBaseStyles.push(
          'max-width: 480px',
          'height: min(90vh, 700px)',
          'border-radius: 24px',
          'border: 1px solid #e4e4e7',
          'transform: scale(0.95)'
        );
      }
      drawer.style.cssText = drawerBaseStyles.join(';');

      // 3. Drag Handle / Top Header for Bottom Sheet
      if (isBottomSheet) {
        var dragBar = document.createElement('div');
        dragBar.style.cssText = [
          'width: 40px',
          'height: 4px',
          'border-radius: 9999px',
          'background: #cbd5e1',
          'margin: 10px auto 4px',
          'cursor: grab'
        ].join(';');
        drawer.appendChild(dragBar);
      }

      // 4. Close Icon Button
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close checkout');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = [
        'position: absolute',
        'top: 10px',
        'right: 14px',
        'width: 32px',
        'height: 32px',
        'border-radius: 50%',
        'border: none',
        'background: #f1f5f9',
        'color: #64748b',
        'font-size: 20px',
        'font-weight: 300',
        'line-height: 1',
        'cursor: pointer',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'z-index: 10'
      ].join(';');

      // 5. Iframe
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = [
        'width: 100%',
        'height: calc(100% - ' + (isBottomSheet ? '20px' : '0px') + ')',
        'border: none',
        'border-radius: ' + (isBottomSheet ? '28px 28px 0 0' : '24px'),
        'background: #ffffff'
      ].join(';');

      drawer.appendChild(closeBtn);
      drawer.appendChild(iframe);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
      activeModalContainer = backdrop;

      // Prevent background scrolling
      document.body.style.overflow = 'hidden';

      // Animate In
      requestAnimationFrame(function () {
        backdrop.style.opacity = '1';
        if (isBottomSheet) {
          drawer.style.transform = 'translateY(0)';
        } else {
          drawer.style.transform = 'scale(1)';
        }
      });

      var self = this;

      return new Promise(function (resolve) {
        var cleanup = function () {
          window.removeEventListener('message', messageListener);
          document.removeEventListener('keydown', escListener);
          self.close();
        };

        var messageListener = function (event) {
          if (!event.data || (event.data.type !== '180_PAYMENT_SUCCESS' && event.data.type !== '180_PAYMENT_CLOSE')) {
            return;
          }

          if (event.data.type === '180_PAYMENT_SUCCESS') {
            cleanup();
            if (options.onSuccess) options.onSuccess(event.data);
            resolve(event.data);
          } else if (event.data.type === '180_PAYMENT_CLOSE') {
            cleanup();
            if (options.onCancel) options.onCancel();
            resolve({ cancelled: true });
          }
        };

        var escListener = function (e) {
          if (e.key === 'Escape') {
            cleanup();
            if (options.onCancel) options.onCancel();
            resolve({ cancelled: true });
          }
        };

        closeBtn.onclick = function () {
          cleanup();
          if (options.onCancel) options.onCancel();
          resolve({ cancelled: true });
        };

        backdrop.onclick = function (e) {
          if (e.target === backdrop) {
            cleanup();
            if (options.onCancel) options.onCancel();
            resolve({ cancelled: true });
          }
        };

        window.addEventListener('message', messageListener);
        document.addEventListener('keydown', escListener);
      });
    },

    /**
     * Dismiss active checkout drawer or modal
     */
    close: function () {
      if (!activeModalContainer) return;
      var backdrop = activeModalContainer;
      var drawer = backdrop.querySelector('#one-eighty-pay-drawer');
      
      if (drawer) {
        drawer.style.transform = 'translateY(100%)';
      }
      backdrop.style.opacity = '0';

      setTimeout(function () {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
        document.body.style.overflow = '';
        activeModalContainer = null;
      }, 250);
    },

    /**
     * Render Branded "Pay with 180 Pay" Drop-In Button
     */
    renderButton: function (target, options) {
      options = options || {};
      var element = typeof target === 'string' ? document.getElementById(target) : target;
      if (!element) throw new Error('[180 Pay] Target element not found');

      var text = options.text || 'Pay with 180 Pay';
      var theme = options.theme || 'dark'; // 'dark' | 'light'
      var isDark = theme === 'dark';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'one-eighty-pay-button';

      var bg = isDark ? '#09090b' : '#ffffff';
      var textCol = isDark ? '#ffffff' : '#09090b';
      var borderCol = isDark ? 'rgba(59, 130, 246, 0.4)' : '#e2e8f0';

      btn.style.cssText = [
        'display: inline-flex',
        'align-items: center',
        'justify-content: center',
        'gap: 10px',
        'background: ' + bg,
        'color: ' + textCol,
        'border: 1px solid ' + borderCol,
        'border-radius: 14px',
        'padding: 10px 20px',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 14px',
        'font-weight: 700',
        'cursor: pointer',
        'box-shadow: 0 4px 14px rgba(37, 99, 235, 0.15)',
        'transition: all 0.2s ease',
        'outline: none',
        'user-select: none'
      ].join(';');

      btn.innerHTML = [
        '<div style="width: 22px; height: 22px; border-radius: 6px; background: #2563eb; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 900;">180</div>',
        '<span>' + text + '</span>'
      ].join('');

      var self = this;
      btn.onclick = function () {
        self.openCheckout(options);
      };

      element.innerHTML = '';
      element.appendChild(btn);
    },

    /**
     * Auto-initialize HTML elements marked with data-180-pay-button
     */
    init: function () {
      var targets = document.querySelectorAll('[data-180-pay-button], #180-pay-button');
      var self = this;
      targets.forEach(function (el) {
        if (el.getAttribute('data-180-pay-init')) return;
        el.setAttribute('data-180-pay-init', 'true');

        var sessionId = el.getAttribute('data-session-id') || '';
        var uxMode = el.getAttribute('data-ux-mode') || 'bottom_sheet';
        var theme = el.getAttribute('data-theme') || 'dark';

        self.renderButton(el, {
          sessionId: sessionId,
          uxMode: uxMode,
          theme: theme,
          onSuccess: function (data) {
            var callbackName = el.getAttribute('data-on-success');
            if (callbackName && typeof window[callbackName] === 'function') {
              window[callbackName](data);
            }
          }
        });
      });
    }
  };

  // Expose globally
  global.OneEightyPay = OneEightyPay;

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        OneEightyPay.init();
      });
    } else {
      OneEightyPay.init();
    }
  }
})(typeof window !== 'undefined' ? window : this);

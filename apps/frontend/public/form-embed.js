/**
 * 180workspace Form Embed SDK
 * Responsive, auto-resizing embed widget for external websites, CRMs, and landing pages.
 * 
 * Usage:
 *   <script data-form="YOUR_SLUG" src="https://your-domain.com/form-embed.js"></script>
 * 
 * Or manually paste an iframe — the SDK will still auto-resize it.
 */
(function() {
  'use strict';

  function init180Forms() {
    // 1. Find all script tags or containers with data-form attributes
    var elements = document.querySelectorAll('script[data-form], script[data-form-slug], script[data-form-id], div[data-180-form], div[data-form-id], div[data-form]');
    
    elements.forEach(function(el) {
      if (el.getAttribute('data-180-initialized')) return;
      el.setAttribute('data-180-initialized', 'true');

      var slug = el.getAttribute('data-form-id') || el.getAttribute('data-form-slug') || el.getAttribute('data-form') || el.getAttribute('data-180-form');
      if (!slug) return;

      var host = el.getAttribute('data-host') || window.location.origin;
      var formUrl = host + '/f/' + slug + '?embed=true';

      // Create responsive iframe
      var iframe = document.createElement('iframe');
      iframe.src = formUrl;
      iframe.style.width = '100%';
      iframe.style.border = 'none';
      iframe.style.overflow = 'visible';
      iframe.style.minHeight = '350px';
      iframe.style.transition = 'height 0.3s ease';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('title', '180workspace Form');
      iframe.setAttribute('id', 'form-iframe-' + slug);

      if (el.tagName.toLowerCase() === 'script') {
        el.parentNode.insertBefore(iframe, el);
      } else {
        el.appendChild(iframe);
      }
    });
  }

  // 2. Universal resize listener — works for ALL iframes (SDK-created, manual paste, CodeElement)
  //    Matches iframe by contentWindow === event.source, so it works regardless of ID or attributes.
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    
    if (event.data.type === '180workspace:form:resize' && event.data.height) {
      var targetHeight = event.data.height;
      var matched = false;

      // Strategy 1: Match by contentWindow (most reliable)
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          if (iframes[i].contentWindow === event.source) {
            iframes[i].style.height = targetHeight + 'px';
            iframes[i].style.overflow = 'visible';
            iframes[i].setAttribute('scrolling', 'no');
            matched = true;
            break;
          }
        } catch(e) {}
      }

      // Strategy 2: Fallback — match by slug-based ID
      if (!matched && event.data.slug) {
        var iframe = document.getElementById('form-iframe-' + event.data.slug);
        if (iframe) {
          iframe.style.height = targetHeight + 'px';
          iframe.style.overflow = 'visible';
          iframe.setAttribute('scrolling', 'no');
        }
      }
    }

    // Handle optional parent window redirection on form submission
    if (event.data.type === '180workspace:form:submitted' && event.data.redirectUrl) {
      if (event.data.target === '_top') {
        window.top.location.href = event.data.redirectUrl;
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init180Forms);
  } else {
    init180Forms();
  }
})();

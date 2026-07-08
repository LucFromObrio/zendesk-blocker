(function() {
  console.log("[Zendesk Blocker] Активний на document_start - ПЕРЕХОПЛЕННЯ НАВІГАЦІЇ");

  let navigationBlockingEnabled = true;
  let lastTicketId = null;

  // === 1. ПЕРЕХОПИТИ history.pushState ДО усього іншого ===
  const originalPushState = window.history.pushState;
  window.history.pushState = function(state, title, url) {
    if (navigationBlockingEnabled && url && url.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО pushState на:", url);
      
      // Витягти ID тікету для логування
      const match = url.match(/\/agent\/tickets\/(\d+)/);
      if (match) {
        lastTicketId = match[1];
        console.log("[Zendesk Blocker] 🔴 Спроба відкрити тікет:", lastTicketId);
      }
      
      return false; // Не виконуємо pushState
    }
    return originalPushState.call(this, state, title, url);
  };

  // === 2. ПЕРЕХОПИТИ history.replaceState ===
  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function(state, title, url) {
    if (navigationBlockingEnabled && url && url.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО replaceState на:", url);
      return false;
    }
    return originalReplaceState.call(this, state, title, url);
  };

  // === 3. ПЕРЕХОПИТИ window.location ЗМІНИ ===
  const originalLocationSetter = Object.getOwnPropertyDescriptor(Location.prototype, 'href').set;
  Object.defineProperty(window.location, 'href', {
    set: function(value) {
      if (navigationBlockingEnabled && value.includes("/agent/tickets/")) {
        console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО window.location.href =", value);
        return;
      }
      return originalLocationSetter.call(this, value);
    }
  });

  // === 4. БЛОКУВАТИ POPSTATE СОБЫТИЯ ===
  window.addEventListener('popstate', (e) => {
    if (navigationBlockingEnabled && window.location.href.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО popstate - навертаємо назад");
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // === 5. СЛУХАТИ HASHCHANGE ===
  window.addEventListener('hashchange', (e) => {
    if (navigationBlockingEnabled && window.location.href.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО hashchange");
      e.preventDefault();
    }
  }, true);

  // === 6. БЛОКУВАТИ WINDOW.OPEN ===
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    if (url && url.includes('/agent/tickets/')) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО window.open:", url);
      return null;
    }
    return originalOpen.call(this, url, target, features);
  };

  // === 7. БЛОКУВАТИ КЛІКАННЯ НА ПОСИЛАННЯ ТІКЕТІВ ===
  document.addEventListener('click', (e) => {
    if (!navigationBlockingEnabled) return;

    const target = e.target.closest('a[href*="/agent/tickets/"], button, [role="button"], [data-test-id*="ticket"]');
    if (target) {
      const href = target.getAttribute('href') || '';
      if (href.includes('/agent/tickets/')) {
        console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО КЛІК на тікет-посилання");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, { capture: true, passive: false });

  // === 8. БЛОКУВАТИ ГОРЯЧІ КЛАВІШІ ===
  document.addEventListener('keydown', (e) => {
    if (!navigationBlockingEnabled) return;

    // Середня кнопка миші = відкриття в новій вкладці
    if (e.button === 1) {
      console.log("[Zendesk Blocker] ❌ Середня кнопка заблокована");
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true, passive: false });

  // === 9. ПЕРЕВІРИТИ, ЧИ URL УЖЕ ЗМІНИВСЯ ===
  setInterval(() => {
    if (navigationBlockingEnabled && window.location.href.includes("/agent/tickets/")) {
      const match = window.location.href.match(/\/agent\/tickets\/(\d+)/);
      if (match && match[1] !== lastTicketId) {
        console.log("[Zendesk Blocker] ⚠️ ДЕТЕКТОВАНА НАВІГАЦІЯ НА ТІКЕТ - ПОВЕРТАЄМО НАЗАД");
        lastTicketId = match[1];
        window.history.back();
      }
    }
  }, 500);

  // === 10. ПЕРЕХОПИТИ FETCH ЗАПИТИ НА АСАЙН ===
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    const options = args[1] || {};
    
    // Если это запрос на обновление тикета (PUT/PATCH с assignee)
    if (navigationBlockingEnabled && 
        url.includes('/api/') && 
        url.includes('tickets') &&
        (options.method === 'PUT' || options.method === 'PATCH') &&
        options.body && 
        options.body.includes('assignee')) {
      console.log("[Zendesk Blocker] ⚠️ Виявлена спроба асайну - дозволяємо, але готуємось блокувати навігацію");
    }
    
    return originalFetch.apply(this, args);
  };

  // === 11. DEBUG: Логування всіх pushState викликів ===
  console.log("[Zendesk Blocker] ✅ Усі перехопники встановлені на document_start");
  console.log("[Zendesk Blocker] pushState перехоплено:", !!originalPushState);
  console.log("[Zendesk Blocker] replaceState перехоплено:", !!originalReplaceState);

  // === 12. ВИВЕСТИ ПОВІДОМЛЕННЯ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log("[Zendesk Blocker] 🟢 ГОТОВИЙ - тікети будуть заблоковані при асайні");
    });
  } else {
    console.log("[Zendesk Blocker] 🟢 ГОТОВИЙ - тікети будуть заблоковані при асайні");
  }

})();

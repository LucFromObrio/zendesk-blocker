(function() {
  console.log("[Zendesk Blocker] Активний на document_start - БЛОКУВАННЯ АВТОМАТИЧНОГО АСАЙНУ");

  let blockAutoNavigationAfterAssign = false;
  let lastFetchTime = 0;
  const ASSIGN_NAVIGATION_WINDOW = 3000; // 3 секунди - вікно для блокування автонавігації

  // === 1. МОНІТОРИТИ АСАЙН ЗАПИТИ ===
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    const options = args[1] || {};
    
    // Если это PUT/PATCH на тикет с assignee
    if (url.includes('/api/') && 
        url.includes('tickets') &&
        (options.method === 'PUT' || options.method === 'PATCH')) {
      
      const body = options.body;
      if (body && typeof body === 'string' && body.includes('assignee')) {
        console.log("[Zendesk Blocker] 🔔 АСАЙН ЗАПИТ ВИЯВЛЕНО - активуємо блокування навігації на 3 сек");
        blockAutoNavigationAfterAssign = true;
        lastFetchTime = Date.now();
        
        // Автоматично відключити блокування через 3 сек
        setTimeout(() => {
          blockAutoNavigationAfterAssign = false;
          console.log("[Zendesk Blocker] ✅ Вікно блокування закрилось - тепер можете клікати на тикети");
        }, ASSIGN_NAVIGATION_WINDOW);
      }
    }
    
    return originalFetch.apply(this, args);
  };

  // === 2. ПЕРЕХОПИТИ history.pushState ТІЛЬКИ ПІСЛЯ АСАЙНУ ===
  const originalPushState = window.history.pushState;
  window.history.pushState = function(state, title, url) {
    if (blockAutoNavigationAfterAssign && url && url.includes("/agent/tickets/")) {
      const timeSinceAssign = Date.now() - lastFetchTime;
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО автоматичну навігацію на тикет (асайн був %.0fмс тому)", timeSinceAssign);
      return false;
    }
    return originalPushState.call(this, state, title, url);
  };

  // === 3. ПЕРЕХОПИТИ history.replaceState ТІЛЬКИ ПІСЛЯ АСАЙНУ ===
  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function(state, title, url) {
    if (blockAutoNavigationAfterAssign && url && url.includes("/agent/tickets/")) {
      const timeSinceAssign = Date.now() - lastFetchTime;
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО replaceState на тикет (асайн був %.0fмс тому)", timeSinceAssign);
      return false;
    }
    return originalReplaceState.call(this, state, title, url);
  };

  // === 4. БЛОКУВАТИ POPSTATE ТІЛЬКИ ПІСЛЯ АСАЙНУ ===
  window.addEventListener('popstate', (e) => {
    if (blockAutoNavigationAfterAssign && window.location.href.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ❌ ЗАБЛОКОВАНО popstate после асайну");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  // === 5. ПЕРЕВІРИТИ, ЧИ URL ЗМІНИВСЯ ПІСЛЯ АСАЙНУ (fallback) ===
  setInterval(() => {
    if (blockAutoNavigationAfterAssign && window.location.href.includes("/agent/tickets/")) {
      console.log("[Zendesk Blocker] ⚠️ ДЕТЕКТОВАНА АВТОМАТИЧНА НАВІГАЦІЯ - ПОВЕРТАЄМО НАЗАД");
      window.history.back();
    }
  }, 200);

  // === 6. ДОЗВОЛИТИ РУЧНЕ КЛІКАННЯ НА ТИКЕТИ ===
  // Ми НЕ блокуємо клік на посилання, так як користувач може самостійно клікати
  // Блокування відбувається тільки на рівні pushState/replaceState після асайну

  // === 7. DEBUG ===
  console.log("[Zendesk Blocker] ✅ Всі перехопники встановлені");
  console.log("[Zendesk Blocker] 🟢 ГОТОВИЙ - ручне відкриття тикетів ДОЗВОЛЕНО, автоматичне БЛОКОВАНО");

})();

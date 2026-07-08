(function() {
  console.log("Zendesk Tab Blocker активний");

  // Перехоплення history API
  const originalPushState = history.pushState;
  history.pushState = function(state, title, url) {
    if (url && url.includes("/agent/tickets/")) {
      console.log("Блоковано створення вкладки:", url);
      return; // не виконуємо
    }
    return originalPushState.apply(this, arguments);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    if (url && url.includes("/agent/tickets/")) {
      console.log("Блоковано оновлення вкладки:", url);
      return;
    }
    return originalReplaceState.apply(this, arguments);
  };

  // Якщо Zendesk використовує власний router.navigate
  const blockRouter = () => {
    if (window.router && typeof window.router.navigate === "function") {
      const originalNavigate = window.router.navigate;
      window.router.navigate = function(url, ...args) {
        if (url && url.includes("/agent/tickets/")) {
          console.log("Блоковано router.navigate:", url);
          return;
        }
        return originalNavigate.apply(this, [url, ...args]);
      };
    }
  };

  // Викликаємо одразу і ще раз після завантаження
  blockRouter();
  setInterval(blockRouter, 2000);
})();

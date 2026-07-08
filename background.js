// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Zendesk Auto-Open Blocker встановлено");
});

// Слухаємо повідомлення від content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "blocked") {
    console.log("Автовідкриття тікета заблоковано на сторінці:", sender.tab.url);
  }
});

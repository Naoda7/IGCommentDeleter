document.getElementById('start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("instagram.com")) {
    chrome.tabs.update(tab.id, { url: "https://www.instagram.com/your_activity/interactions/comments" });
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

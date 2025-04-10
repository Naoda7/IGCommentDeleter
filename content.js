(async function () {
  const TARGET_URL = 'https://www.instagram.com/your_activity/interactions/comments';
  const CURRENT_URL = window.location.href;

  if (!CURRENT_URL.startsWith(TARGET_URL)) {
    window.location.href = TARGET_URL;
    return;
  }

  const DELETION_BATCH_SIZE = 15;
  const DELAY_BETWEEN_ACTIONS_MS = 1000;
  const DELAY_BETWEEN_CHECKBOX_CLICKS_MS = 300;
  const WAIT_AFTER_DELETE_MS = 10000;

  let abortController;
  let isDeleting = false;

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const clickElement = async (element) => {
    if (!element) throw new Error('Element not found');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(200);
    element.click();
  };

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await delay(100);
    }
    throw new Error(`Timeout: Element "${selector}" not found`);
  };

  const deleteSelectedComments = async () => {
    try {
      const deleteSpan = Array.from(document.querySelectorAll('span')).find(
        (span) => span.textContent.trim().toLowerCase() === 'delete'
      );
      if (!deleteSpan) return;

      const deleteBtn = deleteSpan.closest('[role="button"]') || deleteSpan.closest('button');
      if (!deleteBtn) return;

      await clickElement(deleteBtn);
      await delay(1000);

      const modalDeleteBtn = Array.from(document.querySelectorAll('div[role="dialog"] button'))
        .find(btn => btn.textContent.trim().toLowerCase() === 'delete');

      if (modalDeleteBtn) await clickElement(modalDeleteBtn);
    } catch (err) {
      console.error('Failed to delete comment:', err.message);
    }
  };

  const waitForSelectButton = async () => {
    for (let i = 0; i < 30; i++) {
      const [, selectBtn] = document.querySelectorAll('[role="button"]');
      if (selectBtn) return;
      await delay(1000);
    }
  };

  const deleteAllComments = async () => {
    abortController = new AbortController();
    const signal = abortController.signal;

    while (true) {
      if (signal.aborted) break;

      const [, selectBtn] = document.querySelectorAll('[role="button"]');
      if (!selectBtn) break;

      await clickElement(selectBtn);
      await delay(DELAY_BETWEEN_ACTIONS_MS);
      if (signal.aborted) break;

      const checkboxes = document.querySelectorAll('[aria-label="Toggle checkbox"]');
      if (checkboxes.length === 0) break;

      for (let i = 0; i < Math.min(DELETION_BATCH_SIZE, checkboxes.length); i++) {
        if (signal.aborted) break;
        await clickElement(checkboxes[i]);
        await delay(DELAY_BETWEEN_CHECKBOX_CLICKS_MS);
      }

      if (signal.aborted) break;
      await delay(DELAY_BETWEEN_ACTIONS_MS);
      await deleteSelectedComments();
      if (signal.aborted) break;
      await delay(WAIT_AFTER_DELETE_MS);
      if (signal.aborted) break;
      await waitForSelectButton();
    }

    isDeleting = false;
    triggerBtn.innerText = '🔁 Refresh Page';
    setButtonStyle(triggerBtn, 'refresh');
    triggerBtn.disabled = false;
  };

  const existingButton = document.getElementById('instaDeleteTrigger');
  if (existingButton) existingButton.remove();

  const existingClose = document.getElementById('instaCloseTrigger');
  if (existingClose) existingClose.remove();

  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'instaDeleteTrigger';
  triggerBtn.innerText = '🚀 Delete Comment';
  document.body.appendChild(triggerBtn);

  const closeBtn = document.createElement('button');
  closeBtn.id = 'instaCloseTrigger';
  closeBtn.innerText = '✖';
  document.body.appendChild(closeBtn);

  const setButtonStyle = (btn, state) => {
    const baseStyle = {
      position: 'fixed',
      bottom: '60px',
      zIndex: 9999,
      padding: window.innerWidth < 500 ? '10px 14px' : '14px 22px',
      fontSize: window.innerWidth < 500 ? '14px' : '16px',
      fontWeight: '600',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      minWidth: window.innerWidth < 500 ? '160px' : '240px',
      maxWidth: '90vw',
    };

    const styles = {
      start: {
        ...baseStyle,
        right: window.innerWidth < 500 ? '80px' : '100px',
        backgroundColor: 'rgba(255, 0, 76, 0.15)',
        color: '#ED4956',
        border: '1px solid rgba(255, 0, 76, 0.3)',
      },
      deleting: {
        ...baseStyle,
        right: window.innerWidth < 500 ? '80px' : '100px',
        backgroundColor: 'rgba(255, 165, 0, 0.15)',
        color: '#FFA500',
        border: '1px solid rgba(255, 165, 0, 0.3)',
      },
      refresh: {
        ...baseStyle,
        right: window.innerWidth < 500 ? '80px' : '100px',
        backgroundColor: 'rgba(0, 123, 255, 0.15)',
        color: '#007BFF',
        border: '1px solid rgba(0, 123, 255, 0.3)',
      },
      close: {
        position: 'fixed',
        bottom: '60px',
        right: '20px',
        zIndex: 9999,
        padding: window.innerWidth < 500 ? '10px 14px' : '14px 18px',
        fontSize: window.innerWidth < 500 ? '13px' : '16px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.4)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
      }
    };

    Object.assign(btn.style, styles[state]);
  };

  setButtonStyle(triggerBtn, 'start');
  setButtonStyle(closeBtn, 'close');

  triggerBtn.onclick = async () => {
    if (isDeleting) {
      if (abortController) {
        abortController.abort();
        isDeleting = false;
        triggerBtn.innerText = '🔁 Refresh Page';
        setButtonStyle(triggerBtn, 'refresh');
        alert('❌ Operation cancelled!\nThe page will be refreshed...');
        setTimeout(() => location.reload(), 1000);
      }
      return;
    }

    if (!window.location.href.startsWith(TARGET_URL)) {
      window.location.href = TARGET_URL;
      return;
    }

    console.clear();
    isDeleting = true;
    triggerBtn.innerText = '⏳Deleting... (click to cancel)';
    setButtonStyle(triggerBtn, 'deleting');
    closeBtn.remove();
    await deleteAllComments();
  };

  closeBtn.onclick = () => {
    triggerBtn.remove();
    closeBtn.remove();
  };

  window.addEventListener('resize', () => {
    if (!isDeleting) setButtonStyle(triggerBtn, 'start');
    else setButtonStyle(triggerBtn, 'deleting');
    setButtonStyle(closeBtn, 'close');
  });
})();

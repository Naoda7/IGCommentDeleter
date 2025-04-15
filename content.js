(async function () {
  const TARGET_URL = 'https://www.instagram.com/your_activity/interactions/comments';
  const CURRENT_URL = window.location.href;

  if (!CURRENT_URL.startsWith(TARGET_URL)) {
    window.location.href = TARGET_URL;
    return;
  }

  const DELETION_BATCH_SIZE = 20;
  const DELAY_BETWEEN_ACTIONS_MS = 1000;
  const DELAY_BETWEEN_CHECKBOX_CLICKS_MS = 100;

  let abortController;
  let isDeleting = false;
  let lastDeletedCommentText = null;

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const clickElement = async (element) => {
    if (!element) throw new Error('Element not found');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(200);
    element.click();
  };

  const waitForElement = async (selector, timeout = 30000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await delay(500);
    }
    throw new Error(`Timeout: Element "${selector}" not found`);
  };

  const isPageEmpty = () => {
    const noResultsHeading = document.querySelector('[role="heading"][aria-label="No results"]');
    if (noResultsHeading && noResultsHeading.textContent.includes("No results")) {
      return true;
    }
    
    const noCommentsHeading = document.querySelector('[role="heading"][aria-label="You haven\'t commented on anything"]');
    if (noCommentsHeading) {
      return true;
    }
    
    const emptyStateContainer = document.querySelector('[data-testid="generic_container_empty_state"]');
    if (emptyStateContainer) {
      const emptyStateText = emptyStateContainer.innerText;
      if (emptyStateText.includes("You haven't commented") || 
          emptyStateText.includes("When you comment on a photo")) {
        return true;
      }
    }

    const disabledDeleteBtn = document.querySelector('[aria-label="Delete"][disabled]');
    return !!disabledDeleteBtn;
  };

  const deleteSelectedComments = async () => {
    try {
      const selectedComments = document.querySelectorAll('[aria-label="Comment"]');
      if (selectedComments.length > 0) {
        lastDeletedCommentText = selectedComments[selectedComments.length - 1].innerText.trim();
      }

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
      // Silent error (no console.log)
    }
  };

  const deleteAllComments = async () => {
    abortController = new AbortController();
    const signal = abortController.signal;

    while (true) {
      if (signal.aborted) break;

      if (isPageEmpty()) {
        const message = lastDeletedCommentText 
          ? `✅ All comments deleted successfully!\n\nLast comment:\n"${lastDeletedCommentText}"`
          : '✅ All comments deleted successfully!';
        showModal(message);
        break;
      }

      const selectButtons = await waitForElement('[role="button"]');
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

      await delay(1500);
      
      if (isPageEmpty()) {
        const message = lastDeletedCommentText 
          ? `✅ All comments deleted successfully!\n\nLast comment:\n"${lastDeletedCommentText}"`
          : '✅ All comments deleted successfully!';
        showModal(message);
        break;
      }

      let selectBtnFound = false;
      const startTime = Date.now();
      while (!selectBtnFound && Date.now() - startTime < 10000) {
        const buttons = document.querySelectorAll('[role="button"]');
        if (buttons.length >= 2) {
          selectBtnFound = true;
        }
        await delay(500);
      }
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
  triggerBtn.innerText = '🚀 Delete Comments';
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
        showModal('❌ Operation canceled.\nPage will refresh...');
        return;
      }
      return;
    }

    if (!window.location.href.startsWith(TARGET_URL)) {
      window.location.href = TARGET_URL;
      return;
    }

    isDeleting = true;
    triggerBtn.innerText = '⏳ Deleting... (click to cancel)';
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

  const showModal = (message = 'No comments found.') => {
    const modal = document.createElement('div');
    modal.style = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    `;

    const box = document.createElement('div');
    box.style = `
      background: rgba(255, 255, 255, 0.2);
      padding: 28px 32px;
      border-radius: 24px;
      text-align: center;
      max-width: 85%;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      backdropFilter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.3s ease-out;
    `;

    const text = document.createElement('div');
    text.innerText = message;
    text.style = `
      font-size: 16px; 
      margin-bottom: 24px; 
      color: #fff; 
      white-space: pre-line;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      line-height: 1.5;
    `;

    const okBtn = document.createElement('button');
    okBtn.innerText = 'OK';
    okBtn.style = `
      background: rgba(255, 255, 255, 0.15);
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    `;

    okBtn.onmouseenter = () => {
      okBtn.style.background = 'rgba(255, 255, 255, 0.25)';
      okBtn.style.transform = 'translateY(-2px)';
    };
    okBtn.onmouseleave = () => {
      okBtn.style.background = 'rgba(255, 255, 255, 0.15)';
      okBtn.style.transform = 'translateY(0)';
    };

    okBtn.onclick = () => {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        modal.remove();
        location.reload();
      }, 250);
    };

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
    `;
    document.head.appendChild(style);

    box.appendChild(text);
    box.appendChild(okBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);
  };
})();
import { injectHeaderFooter, initAuthNav } from './common.js';

injectHeaderFooter();
initAuthNav();

const form = document.getElementById('contactForm');
const status = document.getElementById('contactStatus');

const setStatus = (message, type = '') => {
  status.textContent = message;
  status.className = `notice ${type}`;
};

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const endpoint = form.dataset.endpoint;
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    subject: form.subject.value.trim(),
    message: form.message.value.trim()
  };

  if (!endpoint) {
    setStatus('Form endpoint tanımlı değil.', 'error');
    return;
  }

  try {
    setStatus('Mesajınız gönderiliyor...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    form.reset();
    setStatus('Mesajınız başarıyla gönderildi. En kısa sürede dönüş yapacağız.', 'ok');
  } catch (error) {
    setStatus(`Mesaj gönderimi başarısız oldu. Lütfen tekrar deneyin (${error.message || error}).`, 'error');
  }
});

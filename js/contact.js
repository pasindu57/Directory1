/* ============================================================
   BODIMA – Contact form (stores demo messages in LocalStorage)
   ============================================================ */
(function () {
  const form = qs('#contactForm');
  if (!form) return;

  const emailOK = v => /^\S+@\S+\.\S+$/.test(v);
  const invalidate = (input, msg) => {
    const field = input.closest('.field');
    field.classList.add('invalid');
    const m = field.querySelector('.field-msg');
    if (m && msg) m.textContent = msg;
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    qsa('.field.invalid', form).forEach(f => f.classList.remove('invalid'));
    let ok = true;
    const name = qs('#cName'), email = qs('#cEmail'), subject = qs('#cSubject'), message = qs('#cMessage');

    if (name.value.trim().length < 3) { invalidate(name, 'Please enter your name.'); ok = false; }
    if (!emailOK(email.value)) { invalidate(email, 'Please enter a valid email.'); ok = false; }
    if (subject.value.trim().length < 3) { invalidate(subject, 'Please enter a subject.'); ok = false; }
    if (message.value.trim().length < 10) { invalidate(message, 'Message must be at least 10 characters.'); ok = false; }
    if (!ok) { showToast('Please fix the highlighted fields.', 'error'); return; }

    const messages = store.get('bodima_messages', []);
    messages.push({ name: name.value.trim(), email: email.value.trim(), subject: subject.value.trim(),
      message: message.value.trim(), sent: new Date().toISOString() });
    store.set('bodima_messages', messages);

    form.reset();
    showToast('Message sent! Our team will reply within 24 hours.');
  });
})();

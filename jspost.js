/* ============================================================
   BODIMA – Post Your Property (create + edit mode)
   Submissions are saved to LocalStorage and marked "Pending
   Approval" – no backend moderation in this demo version.
   ============================================================ */
(function () {
  const form = qs('#postForm');
  if (!form) return;

  const els = {
    title: qs('#pTitle'), owner: qs('#pOwner'), phone: qs('#pPhone'),
    email: qs('#pEmail'), whatsapp: qs('#pWhatsapp'), district: qs('#pDistrict'),
    city: qs('#pCity'), address: qs('#pAddress'), type: qs('#pType'),
    gender: qs('#pGender'), price: qs('#pPrice'), rooms: qs('#pRooms'),
    desc: qs('#pDesc'), rules: qs('#pRules'),
    images: qs('#pImages'), previews: qs('#imagePreview'),
    facilGrid: qs('#facilGrid'), btn: qs('#postBtn'),
    formCard: qs('#formCard'), success: qs('#successPanel')
  };

  /* ----- Static options ----- */
  els.district.innerHTML = '<option value="">Select district</option>' +
    DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('');
  els.type.innerHTML = '<option value="">Select type</option>' +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  els.facilGrid.innerHTML = FACILITIES.map(f =>
    `<label class="check-item"><input type="checkbox" name="pfacil" value="${f}"> ${f}</label>`).join('');

  function fillCityOptions(district, selected = '') {
    const cities = district ? (CITIES_BY_DISTRICT[district] || []) : [];
    els.city.innerHTML = '<option value="">Select city</option>' +
      cities.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
  }
  els.district.addEventListener('change', () => fillCityOptions(els.district.value));

  /* ----- Validation helpers ----- */
  const emailOK = v => /^\S+@\S+\.\S+$/.test(v);
  const phoneOK = v => /^(\+94|94|0)?7\d{8}$/.test(v.replace(/\s/g, ''));
  function invalidate(input, msg) {
    const field = input.closest('.field');
    field.classList.add('invalid');
    const m = field.querySelector('.field-msg');
    if (m && msg) m.textContent = msg;
  }
  const clearAllInvalid = () => qsa('.field.invalid', form).forEach(f => f.classList.remove('invalid'));
  qsa('input, select, textarea', form).forEach(el =>
    el.addEventListener('input', () => el.closest('.field')?.classList.remove('invalid')));

  /* ----- Image uploads (FileReader → base64 into LocalStorage) ----- */
  let uploadedImages = [];
  const MAX_IMAGES = 4, MAX_KB = 400;

  function renderPreviews() {
    els.previews.innerHTML = uploadedImages.map((src, i) => `
      <div class="preview-item">
        <img src="${src}" alt="Property image ${i + 1}">
        <button type="button" class="preview-remove" data-i="${i}" aria-label="Remove image">&times;</button>
      </div>`).join('');
  }
  els.images.addEventListener('change', () => {
    const files = [...els.images.files];
    files.forEach(file => {
      if (uploadedImages.length >= MAX_IMAGES) { showToast(`Maximum ${MAX_IMAGES} images allowed.`, 'error'); return; }
      if (file.size > MAX_KB * 1024) { showToast(`"${file.name}" is larger than ${MAX_KB} KB and was skipped.`, 'error'); return; }
      const reader = new FileReader();
      reader.onload = ev => { uploadedImages.push(ev.target.result); renderPreviews(); };
      reader.readAsDataURL(file);
    });
    els.images.value = '';
  });
  els.previews.addEventListener('click', e => {
    const btn = e.target.closest('.preview-remove');
    if (!btn) return;
    uploadedImages.splice(+btn.dataset.i, 1);
    renderPreviews();
  });

  /* ----- Edit mode (?edit=<id>) ----- */
  const editId = getParams().get('edit');
  let editRecord = null;
  if (editId) {
    editRecord = getUserProperties().find(p => p.id === editId);
    const session = getSession();
    if (!editRecord || !session || session.email !== editRecord.ownerEmail) {
      showToast('You can only edit your own listings. Please login first.', 'error');
      setTimeout(() => (location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + '?edit=' + editId)), 800);
      return;
    }
    qs('#postPageTitle').textContent = 'Edit Your Property';
    qs('#postPageSub').textContent = 'Update your listing details below. Changes will be re-checked by our team.';
    els.btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    qs('#pageHeroTitle') && (qs('#pageHeroTitle').textContent = 'Edit Property');

    // Prefill
    els.title.value = editRecord.title; els.owner.value = editRecord.owner;
    els.phone.value = editRecord.phone; els.email.value = editRecord.email || '';
    els.whatsapp.value = editRecord.whatsapp || '';
    els.district.value = editRecord.district; fillCityOptions(editRecord.district, editRecord.city);
    els.address.value = editRecord.address; els.type.value = editRecord.type;
    els.gender.value = editRecord.gender || 'Any';
    els.price.value = editRecord.price; els.rooms.value = editRecord.rooms;
    els.desc.value = editRecord.description;
    els.rules.value = (editRecord.rules || []).join('\n');
    qsa('input[name="pfacil"]').forEach(c => (c.checked = (editRecord.facilities || []).includes(c.value)));
    uploadedImages = [...(editRecord.images || [])];
    renderPreviews();
  }

  /* ----- Submit ----- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    clearAllInvalid();
    let ok = true;

    if (els.title.value.trim().length < 6) { invalidate(els.title, 'Title must be at least 6 characters.'); ok = false; }
    if (els.owner.value.trim().length < 3) { invalidate(els.owner, 'Please enter the owner name.'); ok = false; }
    if (!phoneOK(els.phone.value)) { invalidate(els.phone, 'Enter a valid Sri Lankan mobile (e.g. 0771234567).'); ok = false; }
    if (!emailOK(els.email.value)) { invalidate(els.email, 'Please enter a valid email address.'); ok = false; }
    if (!els.district.value) { invalidate(els.district, 'Please select a district.'); ok = false; }
    if (!els.city.value) { invalidate(els.city, 'Please select a city.'); ok = false; }
    if (els.address.value.trim().length < 8) { invalidate(els.address, 'Please enter the full street address.'); ok = false; }
    if (!els.type.value) { invalidate(els.type, 'Please select an accommodation type.'); ok = false; }
    const price = parseFloat(els.price.value);
    if (!price || price < 1000 || price > 500000) { invalidate(els.price, 'Enter a monthly rent between Rs 1,000 and Rs 500,000.'); ok = false; }
    const rooms = parseInt(els.rooms.value, 10);
    if (!rooms || rooms < 1 || rooms > 50) { invalidate(els.rooms, 'Enter between 1 and 50 rooms.'); ok = false; }
    if (els.desc.value.trim().length < 20) { invalidate(els.desc, 'Please write a description (min 20 characters).'); ok = false; }
    if (!ok) { showToast('Please fix the highlighted fields.', 'error'); return; }

    const session = getSession();
    const facilities = qsa('input[name="pfacil"]:checked').map(c => c.value);
    const images = uploadedImages.length
      ? uploadedImages
      : [IMG('1586023492125-27b2c045efd7'), IMG('1560448204-e02f11c3d0e2')]; // stock images if none uploaded

    const record = {
      id: editRecord ? editRecord.id : 'u' + Date.now(),
      title: els.title.value.trim(),
      type: els.type.value,
      district: els.district.value,
      city: els.city.value,
      address: els.address.value.trim(),
      price: Math.round(price),
      rooms,
      gender: els.gender.value || 'Any',
      facilities,
      description: els.desc.value.trim(),
      rules: els.rules.value.split('\n').map(r => r.trim()).filter(Boolean),
      owner: els.owner.value.trim(),
      phone: els.phone.value.trim(),
      whatsapp: waDigits(els.whatsapp.value || els.phone.value),
      email: els.email.value.trim(),
      ownerEmail: session ? session.email : els.email.value.trim().toLowerCase(),
      images,
      featured: false, verified: false, available: true,
      status: 'pending',
      added: editRecord ? editRecord.added : new Date().toISOString().slice(0, 10)
    };

    const list = getUserProperties();
    if (editRecord) {
      const idx = list.findIndex(p => p.id === editId);
      list[idx] = record;
      store.set(USER_PROPS_KEY, list);
      showToast('Listing updated successfully!');
    } else {
      list.unshift(record);
      store.set(USER_PROPS_KEY, list);
      showToast('Property submitted! It is now visible with a "Pending Approval" badge.');
    }

    // Success panel
    els.formCard.classList.add('hidden');
    els.success.classList.add('show');
    qs('#successActions').innerHTML = `
      <a href="property-details.html?id=${record.id}" class="btn btn-navy">View Listing</a>
      ${session ? '<a href="dashboard.html" class="btn btn-outline">Go to Dashboard</a>'
                : '<a href="register.html" class="btn btn-outline">Create an Account</a>'}
      <a href="post-property.html" class="btn btn-ghost">Post Another</a>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

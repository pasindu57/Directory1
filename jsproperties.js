/* ============================================================
   BODIMA – Browse Properties: search, filters, sort, load more
   ============================================================ */
(function () {
  const els = {
    search: qs('#searchInput'), district: qs('#fDistrict'), city: qs('#fCity'),
    type: qs('#fType'), gender: qs('#fGender'), min: qs('#fMin'), max: qs('#fMax'),
    rooms: qs('#fRooms'), sort: qs('#sortSelect'), grid: qs('#propGrid'),
    count: qs('#resultCount'), empty: qs('#emptyState'),
    moreWrap: qs('#loadMoreWrap'), more: qs('#loadMoreBtn'),
    panel: qs('#filtersPanel'), toggle: qs('#filterToggle'), close: qs('#closeFilters'),
    clear: qs('#clearFilters'), emptyClear: qs('#emptyClear'),
    facilBox: qs('#facilFilters')
  };
  if (!els.grid) return;

  const PER_PAGE = 9;
  let shown = 0;
  let overlay = null;

  /* ----- Populate filter controls ----- */
  els.district.innerHTML = '<option value="">All Districts</option>' +
    DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('');
  els.type.innerHTML = '<option value="">All Types</option>' +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  els.rooms.innerHTML = '<option value="0">Any</option>' +
    [1, 2, 3, 5].map(n => `<option value="${n}">${n}+ rooms</option>`).join('');
  els.facilBox.innerHTML = FACILITIES.map(f =>
    `<label class="check-item"><input type="checkbox" name="facil" value="${f}"> ${f}</label>`).join('');

  // City options come from actual listings so user-submitted cities appear too
  function fillCities(district) {
    const source = district
      ? getPublicProperties().filter(p => p.district === district)
      : getPublicProperties();
    const cities = [...new Set(source.map(p => p.city))].sort();
    els.city.innerHTML = '<option value="">All Cities</option>' +
      cities.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  fillCities('');

  /* ----- Prefill from URL (?q= &type= &max= ...) ----- */
  (function prefill() {
    const P = getParams();
    const setType = v => { if (CATEGORIES.includes(v)) els.type.value = v; };
    const setCity = (city, district) => {
      if (district) { els.district.value = district; fillCities(district); }
      if ([...els.city.options].some(o => o.value === city)) els.city.value = city;
      else els.search.value = city;
    };
    if (P.get('type')) setType(P.get('type'));
    if (P.get('max')) els.max.value = P.get('max');
    if (P.get('gender')) els.gender.value = P.get('gender');
    if (P.get('district')) { els.district.value = P.get('district'); fillCities(P.get('district')); }
    if (P.get('city')) setCity(P.get('city'), P.get('district') || findDistrictByCity(P.get('city')));
    if (P.get('q')) {
      const q = P.get('q');
      if (DISTRICTS.includes(q)) { els.district.value = q; fillCities(q); }
      else if (findDistrictByCity(q)) setCity(q, findDistrictByCity(q));
      else els.search.value = q;
    }
  })();

  /* ----- Core filter + sort ----- */
  function applyFilters() {
    const f = {
      q: (els.search.value || '').trim().toLowerCase(),
      district: els.district.value, city: els.city.value, type: els.type.value,
      gender: els.gender.value,
      min: parseFloat(els.min.value) || 0,
      max: parseFloat(els.max.value) || Infinity,
      rooms: parseInt(els.rooms.value, 10) || 0,
      facils: qsa('input[name="facil"]:checked').map(c => c.value)
    };
    let list = getPublicProperties().filter(p =>
      (!f.q || [p.title, p.city, p.district, p.address, p.description].join(' ').toLowerCase().includes(f.q)) &&
      (!f.district || p.district === f.district) &&
      (!f.city || p.city === f.city) &&
      (!f.type || p.type === f.type) &&
      (!f.gender || p.gender === f.gender) &&
      p.price >= f.min && p.price <= f.max &&
      p.rooms >= f.rooms &&
      f.facils.every(fc => (p.facilities || []).includes(fc))
    );

    switch (els.sort.value) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'newest': list.sort((a, b) => (b.added || '').localeCompare(a.added || '')); break;
      default: list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        (b.added || '').localeCompare(a.added || ''));
    }
    return list;
  }

  /* ----- Render with Load More ----- */
  function render(reset = true) {
    const list = applyFilters();
    els.count.textContent = `${list.length} place${list.length !== 1 ? 's' : ''} found`;
    if (reset) { els.grid.innerHTML = ''; shown = 0; }

    const slice = list.slice(shown, shown + PER_PAGE);
    els.grid.insertAdjacentHTML('beforeend', slice.map(renderPropCard).join(''));
    shown += slice.length;

    els.empty.classList.toggle('show', list.length === 0);
    els.moreWrap.classList.toggle('hidden', shown >= list.length);
    initReveal(els.grid);
  }

  /* ----- Events ----- */
  [els.search, els.district, els.city, els.type, els.gender, els.min, els.max, els.rooms]
    .forEach(el => el && el.addEventListener('input', () => render(true)));
  els.district.addEventListener('change', () => { fillCities(els.district.value); render(true); });
  els.sort.addEventListener('change', () => render(true));
  els.more.addEventListener('click', () => render(false));

  function closePanel() {
    els.panel.classList.remove('open');
    if (overlay) { overlay.remove(); overlay = null; }
  }
  els.toggle.addEventListener('click', () => {
    els.panel.classList.add('open');
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,33,56,.5);z-index:70;';
    overlay.addEventListener('click', closePanel);
    document.body.appendChild(overlay);
  });
  if (els.close) els.close.addEventListener('click', closePanel);

  function clearAll() {
    els.search.value = ''; els.district.value = ''; fillCities(''); els.city.value = '';
    els.type.value = ''; els.gender.value = ''; els.min.value = ''; els.max.value = '';
    els.rooms.value = '0';
    qsa('input[name="facil"]').forEach(c => (c.checked = false));
    history.replaceState(null, '', 'properties.html');
    render(true);
  }
  els.clear.addEventListener('click', clearAll);
  if (els.emptyClear) els.emptyClear.addEventListener('click', clearAll);

  /* ----- First paint: skeleton → results ----- */
  els.grid.innerHTML = [1, 2, 3, 4, 5, 6].map(() =>
    `<div class="skel-card"><div class="skel skel-img"></div>
      <div class="skel skel-line w80"></div><div class="skel skel-line w60"></div>
      <div class="skel skel-line w40"></div><div class="skel skel-pad"></div></div>`).join('');
  setTimeout(() => render(true), 550);
})();

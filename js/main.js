/* ============================================================
   BODIMA – Shared UI & App Logic (header, footer, auth,
   favorites, toasts, suggestions, helpers)
   ============================================================ */

/* ---------- Tiny helpers ---------- */
const qs  = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); }
};

const escapeHTML = (str = '') => String(str)
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatLKR = n => 'Rs ' + Number(n || 0).toLocaleString('en-US');
const getParams = () => new URLSearchParams(location.search);
const initialsOf = (name = 'B') => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const waDigits = n => String(n || '').replace(/\D/g, '').replace(/^0/, '94');
const genderLabel = g => ({ Female: 'Girls only', Male: 'Boys only', Any: 'Co-living / Any' }[g] || 'Any');
const prettyDate = iso => {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

/* ---------- Brand logo (inline SVG) ---------- */
const LOGO_SVG = `
<svg class="logo-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#142B4A"/>
  <path d="M12 24.5 24 14l12 10.5V34a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 12 34Z"
        fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M24 31.6c-2.9-2.7-4.5-4.8-4.5-6.7a4.5 4.5 0 1 1 9 0c0 1.9-1.6 4-4.5 6.7Z" fill="#FF8A35"/>
  <circle cx="24" cy="24.6" r="1.7" fill="#FFFFFF"/>
</svg>`;

/* ---------- Toast notifications ---------- */
function showToast(message, type = 'success') {
  let wrap = qs('#toastWrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>
                 <button class="toast-close" aria-label="Dismiss">&times;</button>`;
  wrap.appendChild(t);
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
  t.querySelector('.toast-close').addEventListener('click', close);
  setTimeout(close, 3800);
}

/* ---------- Favorites ---------- */
const FAV_KEY = 'bodima_favorites';
const getFavorites = () => store.get(FAV_KEY, []);
const isFav = id => getFavorites().includes(id);

function toggleFavorite(id) {
  let favs = getFavorites();
  const adding = !favs.includes(id);
  favs = adding ? [...favs, id] : favs.filter(f => f !== id);
  store.set(FAV_KEY, favs);
  qsa(`.fav-btn[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('active', adding);
    const icon = btn.querySelector('i');
    if (icon) icon.className = `${adding ? 'fa-solid' : 'fa-regular'} fa-heart`;
  });
  showToast(adding ? 'Saved to your favourites ♥' : 'Removed from your saved list', adding ? 'success' : 'info');
  document.dispatchEvent(new CustomEvent('fav:change', { detail: { id, adding } }));
  return adding;
}

/* ---------- Authentication (frontend demo only – NOT secure) ---------- */
const SESSION_KEY = 'bodima_session';
const USERS_KEY = 'bodima_users';

const getSession = () => store.get(SESSION_KEY);
const getUsers = () => store.get(USERS_KEY, []);

function setSession(user) {
  store.set(SESSION_KEY, { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, joined: user.joined });
  renderHeaderAuth();
}
function logoutUser() {
  store.remove(SESSION_KEY);
  renderHeaderAuth();
  showToast('You have been logged out. See you soon!', 'info');
  if (document.body.dataset.page === 'dashboard') setTimeout(() => (location.href = 'index.html'), 600);
}

/* ---------- Property store (sample + LocalStorage submissions) ---------- */
const USER_PROPS_KEY = 'bodima_properties';
const getUserProperties = () => store.get(USER_PROPS_KEY, []);
const saveUserProperties = list => store.set(USER_PROPS_KEY, list);
const getPublicProperties = () => [...getUserProperties(), ...SAMPLE_PROPERTIES];
const getPropertyById = id => getPublicProperties().find(p => p.id === id);

/* ---------- Reusable property card ---------- */
function renderPropCard(p) {
  const fav = isFav(p.id);
  const facils = p.facilities || [];
  const shown = facils.slice(0, 4);
  const more = facils.length - shown.length;
  const badges = [
    p.status === 'pending' ? `<span class="badge badge-amber"><i class="fa-regular fa-clock"></i> Pending Approval</span>` : '',
    p.verified && p.status !== 'pending' ? `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Verified</span>` : '',
    `<span class="badge badge-navy">${escapeHTML(p.type)}</span>`,
    p.available ? '' : `<span class="badge badge-red">Currently Full</span>`
  ].join('');
  return `
  <article class="prop-card reveal">
    <div class="prop-media">
      <img src="${p.images[0]}" alt="${escapeHTML(p.title)}" loading="lazy" onerror="imgFail(this)">
      <div class="prop-badges">${badges}</div>
      <button class="fav-btn ${fav ? 'active' : ''}" data-id="${p.id}" aria-label="Save to favourites">
        <i class="${fav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
      </button>
    </div>
    <div class="prop-body">
      <h3 class="prop-title"><a href="property-details.html?id=${p.id}">${escapeHTML(p.title)}</a></h3>
      <p class="prop-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(p.city)}, ${escapeHTML(p.district)}</p>
      <div class="prop-meta">
        <span><i class="fa-solid fa-door-closed"></i>${p.rooms} room${p.rooms > 1 ? 's' : ''}</span>
        <span><i class="fa-solid fa-venus-mars"></i>${genderLabel(p.gender)}</span>
      </div>
      <div class="prop-facils">
        ${shown.map(f => `<span class="facil-chip">${escapeHTML(f)}</span>`).join('')}
        ${more > 0 ? `<span class="facil-chip more">+${more} more</span>` : ''}
      </div>
      <div class="prop-foot">
        <div class="prop-price">${formatLKR(p.price)}<span>/mo</span></div>
        <a href="property-details.html?id=${p.id}" class="btn btn-outline btn-sm">View Details</a>
      </div>
    </div>
  </article>`;
}

/* ---------- Header ---------- */
const NAV_LINKS = [
  { href: 'index.html', label: 'Home', key: 'home' },
  { href: 'properties.html', label: 'Browse Properties', key: 'properties' },
  { href: 'index.html#categories', label: 'Categories', key: 'categories' },
  { href: 'about.html', label: 'About Us', key: 'about' },
  { href: 'contact.html', label: 'Contact', key: 'contact' }
];

function renderHeader() {
  const header = qs('#siteHeader');
  if (!header) return;
  const page = document.body.dataset.page;
  const links = NAV_LINKS.map(l =>
    `<a href="${l.href}" class="${page === l.key ? 'active' : ''}">${l.label}</a>`).join('');
  header.innerHTML = `
    <div class="container nav-wrap">
      <a class="logo" href="index.html" aria-label="BODIMA home">${LOGO_SVG}
        <span class="logo-text">BODIMA<span class="logo-dot">.</span></span></a>
      <nav class="nav-links" aria-label="Main navigation">${links}</nav>
      <div class="nav-actions" id="navActions"></div>
      <button class="hamburger" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
        <i class="fa-solid fa-bars"></i></button>
    </div>
    <div class="mobile-panel" id="mobilePanel"></div>`;
  renderHeaderAuth();

  // Sticky shadow
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile menu
  qs('#navToggle').addEventListener('click', () => {
    const panel = qs('#mobilePanel');
    const open = panel.classList.toggle('open');
    qs('#navToggle').setAttribute('aria-expanded', open);
    qs('#navToggle i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  });
}

function renderHeaderAuth() {
  const box = qs('#navActions');
  if (!box) return;
  const s = getSession();
  box.innerHTML = s ? `
    <a href="dashboard.html" class="nav-user" title="Go to dashboard">
      <span class="avatar">${initialsOf(s.name)}</span><span>${escapeHTML(s.name.split(' ')[0])}</span>
    </a>
    <a href="post-property.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i><span> Post Property</span></a>
    <button class="btn btn-ghost btn-sm" data-action="logout"><i class="fa-solid fa-right-from-bracket"></i><span> Logout</span></button>
  ` : `
    <a href="login.html" class="btn btn-ghost">Login / Register</a>
    <a href="post-property.html" class="btn btn-primary"><i class="fa-solid fa-plus"></i><span> Post Your Property</span></a>
  `;
  const panel = qs('#mobilePanel');
  if (panel) {
    const page = document.body.dataset.page;
    panel.innerHTML = `
      <nav class="mobile-nav" aria-label="Mobile navigation">
        ${NAV_LINKS.map(l => `<a href="${l.href}" class="${page === l.key ? 'active' : ''}">${l.label}</a>`).join('')}
      </nav>
      <div class="mobile-actions">${box.innerHTML}</div>`;
  }
}

/* ---------- Footer ---------- */
function renderFooter() {
  const footer = qs('#siteFooter');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="logo" href="index.html">${LOGO_SVG}<span class="logo-text">BODIMA<span class="logo-dot">.</span></span></a>
          <p>BODIMA is Sri Lanka's friendly accommodation directory, helping students, professionals and travellers find boarding places, annexes, hostels and rooms — quickly and safely.</p>
          <div class="social-row">
            <a class="social-link" href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
            <a class="social-link" href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a class="social-link" href="#" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
            <a class="social-link" href="#" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
            <a class="social-link" href="#" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
          </div>
        </div>
        <div>
          <h4 class="footer-title">Quick Links</h4>
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="properties.html">Browse Properties</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="post-property.html">Post Your Property</a></li>
            <li><a href="register.html">Create Account</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-title">Popular Locations</h4>
          <ul class="footer-links">
            ${LOCATIONS.map(l => `<li><a href="properties.html?q=${encodeURIComponent(l.name)}">${l.name}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 class="footer-title">Contact</h4>
          <ul class="footer-contact">
            <li><i class="fa-solid fa-location-dot"></i><span>No. 42, Ward Place,<br>Colombo 07, Sri Lanka</span></li>
            <li><i class="fa-solid fa-phone"></i><span>+94 11 234 5678</span></li>
            <li><i class="fa-solid fa-envelope"></i><span>hello@bodima.lk</span></li>
            <li><i class="fa-solid fa-clock"></i><span>Mon – Sat, 8.30 AM – 6.00 PM</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} BODIMA — Sri Lanka's Accommodation Directory. All rights reserved.</span>
        <span>Demo build · all data is stored locally in your browser.</span>
      </div>
    </div>`;
}

/* ---------- Global click delegation (favorites, logout, pw toggle, mobile panel) ---------- */
document.addEventListener('click', e => {
  const fav = e.target.closest('.fav-btn');
  if (fav) { e.preventDefault(); toggleFavorite(fav.dataset.id); return; }

  const out = e.target.closest('[data-action="logout"]');
  if (out) { e.preventDefault(); logoutUser(); return; }

  const pw = e.target.closest('.toggle-pw');
  if (pw) {
    const inp = qs('#' + pw.dataset.target);
    if (inp) {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      pw.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    }
    return;
  }

  // Close mobile panel after choosing a link
  if (e.target.closest('#mobilePanel a, #mobilePanel .btn')) {
    const panel = qs('#mobilePanel');
    if (panel) panel.classList.remove('open');
    const t = qs('#navToggle i'); if (t) t.className = 'fa-solid fa-bars';
  }
});

/* ---------- Scroll-reveal animation ---------- */
function initReveal(root = document) {
  const els = qsa('.reveal', root).filter(el => !el.classList.contains('visible'));
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('visible')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, { threshold: 0.07 });
  els.forEach(el => io.observe(el));
}

/* ---------- Animated counters ---------- */
function initCounters() {
  const nums = qsa('.stat-num');
  if (!nums.length) return;
  const animate = el => {
    const target = +el.dataset.count || 0, t0 = performance.now();
    const step = t => {
      const k = Math.min((t - t0) / 1200, 1);
      el.textContent = Math.round(target * k).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { nums.forEach(animate); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.4 });
  nums.forEach(n => io.observe(n));
}

/* ---------- Search suggestions (cities + districts) ---------- */
const SUGGEST_DATA = [...new Set([...Object.values(CITIES_BY_DISTRICT).flat(), ...DISTRICTS])].sort();

function initSuggestions() {
  qsa('[data-suggest]').forEach(input => {
    const wrap = input.closest('.suggest-wrap');
    if (!wrap) return;
    let list = wrap.querySelector('.suggest-list');
    if (!list) { list = document.createElement('div'); list.className = 'suggest-list'; wrap.appendChild(list); }
    const render = () => {
      const val = input.value.trim().toLowerCase();
      const matches = val ? SUGGEST_DATA.filter(c => c.toLowerCase().includes(val)).slice(0, 6) : [];
      list.innerHTML = matches.map(c => `<button type="button" class="suggest-item">${c}</button>`).join('');
      list.classList.toggle('show', matches.length > 0);
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 160));
    list.addEventListener('mousedown', e => {
      const item = e.target.closest('.suggest-item');
      if (!item) return;
      input.value = item.textContent;
      list.classList.remove('show');
    });
  });
}

/* ---------- Boot ---------- */
renderHeader();
renderFooter();
initReveal();
initCounters();
initSuggestions();

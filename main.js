(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const WA = '5511981500782';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // bloqueia pinça no iOS
  ['gesturestart', 'gesturechange'].forEach(e => document.addEventListener(e, ev => ev.preventDefault(), { passive: false }));

  // intro
  const start = () => {
    document.body.classList.remove('is-loading');
    requestAnimationFrame(() => document.body.classList.add('ready'));
  };
  setTimeout(start, 1500);

  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- horário de São Paulo ---------- */
  const spNow = () => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { day, h: (+g('hour') % 24) + (+g('minute')) / 60 };
  };
  const SCHED = { 1: [6, 23], 2: [6, 23], 3: [6, 23], 4: [6, 23], 5: [6, 23], 6: [8.5, 13] };
  const fmt = h => `${String(Math.floor(h)).padStart(2, '0')}h${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : ''}`;
  const status = () => {
    const { day, h } = spNow();
    const s = SCHED[day];
    if (!s) return { open: null, txt: 'Domingo: confirme no WhatsApp' };
    if (h >= s[0] && h < s[1]) return { open: 1, txt: `Aberta agora · fecha às ${fmt(s[1])}` };
    if (h < s[0]) return { open: 0, txt: `Fechada · abre hoje às ${fmt(s[0])}` };
    const next = day === 6 ? 'segunda às 06h' : day === 5 ? 'sábado às 08h30' : 'amanhã às 06h';
    return { open: 0, txt: `Fechada · abre ${next}` };
  };
  const paintStatus = () => {
    const st = status();
    $$('[data-status]').forEach(el => {
      el.dataset.open = st.open === null ? '' : st.open;
      $('.status__txt', el).textContent = st.txt;
    });
    const { day, h } = spNow();
    $$('.hours__list li').forEach(li => li.classList.toggle('today', +li.dataset.day === day));
    const hand = $('.dial__hand');
    if (hand) hand.style.transform = `rotate(${(h / 24) * 360}deg)`;
  };

  // mostrador 24h
  const dial = $('.dial');
  if (dial) {
    const pt = (hr, r) => { const a = (hr / 24) * 2 * Math.PI - Math.PI / 2; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };
    const arc = (a, b, r) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${b - a > 12 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`; };
    const [wk, sat] = $$('.dial__open', dial);
    wk.setAttribute('d', arc(6, 23, 80));
    sat.setAttribute('d', arc(8.5, 13, 66));
    const g = $('.dial__ticks', dial);
    let svg = '';
    for (let i = 0; i < 24; i++) {
      const [x1, y1] = pt(i, 88), [x2, y2] = pt(i, i % 3 ? 85 : 82);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      if (i % 3 === 0) { const [tx, ty] = pt(i, 52); svg += `<text x="${tx}" y="${ty}">${String(i).padStart(2, '0')}</text>`; }
    }
    g.innerHTML = svg;
  }
  paintStatus();
  setInterval(paintStatus, 30000);

  /* ---------- manifesto palavra a palavra ---------- */
  const man = $('[data-words]');
  if (man) man.innerHTML = man.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = man ? $$('.w', man) : [];

  /* ---------- contadores ---------- */
  const counters = $$('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now();
    const tick = t => {
      const k = clamp((t - t0) / 1400, 0, 1), v = to * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(dec).replace('.', ',');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    cio.unobserve(el);
  }), { threshold: .6 });
  counters.forEach(c => cio.observe(c));

  /* ---------- reveal ---------- */
  $$('.mods__head, .pool__content, .hours__info, .hours__clock, .plan__intro, .plan__form, .partners h2, .partner, .gallery__head, .ph, .reviews__score, blockquote, .local__info').forEach(el => el.setAttribute('data-reveal', ''));
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { threshold: .15 });
  $$('[data-reveal]').forEach(el => rio.observe(el));

  /* ---------- vídeos só tocam visíveis ---------- */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: .2 });
  $$('video').forEach(v => vio.observe(v));

  /* ---------- modalidades horizontais ---------- */
  const mods = $('.mods'), track = $('.mods__track'), sticky = $('.mods__sticky'), modIdx = $('[data-mod-index]');
  const modCards = $$('.mod');
  const isWide = () => innerWidth > 760;
  const sizeMods = () => {
    if (!mods) return;
    if (!isWide()) { mods.style.height = ''; track.style.transform = ''; return; }
    const dist = track.scrollWidth - innerWidth;
    mods.style.height = `${sticky.offsetHeight + Math.max(0, dist)}px`;
  };

  /* ---------- scroll ---------- */
  const nav = $('.nav'), bar = $('.progress span');
  const pool = $('.pool'), swimmer = $('.pool__swimmer i'), meters = $('[data-meters]');
  const hero = $('.hero__video');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    nav.classList.toggle('is-solid', y > 40);
    bar.style.transform = `scaleX(${y / Math.max(1, document.documentElement.scrollHeight - vh)})`;
    if (hero && y < vh) hero.style.transform = `scale(${1.08 + y / vh * .12}) translateY(${y * .25}px)`;

    if (man) {
      const r = man.getBoundingClientRect();
      const k = clamp((vh * .85 - r.top) / (r.height + vh * .35), 0, 1);
      const n = Math.round(k * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    if (mods && isWide()) {
      const r = mods.getBoundingClientRect();
      const total = mods.offsetHeight - sticky.offsetHeight;
      const k = clamp(-r.top / Math.max(1, total), 0, 1);
      const dist = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-k * dist}px,0,0)`;
      const idx = clamp(Math.round(k * (modCards.length - 1)), 0, modCards.length - 1);
      modIdx.textContent = String(idx + 1).padStart(2, '0');
    }

    if (pool) {
      const r = pool.getBoundingClientRect();
      const k = clamp((vh - r.top) / (r.height + vh), 0, 1);
      const laps = k * 4; // 4 piscinas de 25 m
      const lap = Math.floor(laps), f = laps - lap;
      const w = pool.offsetWidth - 36;
      const x = lap % 2 ? (1 - f) * w : f * w;
      swimmer.style.transform = `translateX(${x}px) scaleX(${lap % 2 ? -1 : 1})`;
      meters.textContent = `${Math.round(laps * 25)} m`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { sizeMods(); onScroll(); });
  addEventListener('load', () => { sizeMods(); onScroll(); });
  sizeMods(); onScroll();

  /* ---------- monte seu plano ---------- */
  const form = $('.plan__form');
  if (form) {
    const preview = $('[data-preview]'), send = $('[data-send]'), name = $('input[name=nome]', form);
    const pick = g => $$(`[data-group="${g}"] button.on`, form).map(b => b.textContent);
    $$('.chips', form).forEach(ch => ch.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (ch.hasAttribute('data-single')) $$('button', ch).forEach(x => x !== b && x.classList.remove('on'));
      b.classList.toggle('on');
      build();
    }));
    name.addEventListener('input', build);
    function build() {
      const obj = pick('objetivo')[0], mod = pick('modalidades'), per = pick('periodo')[0], app = pick('app')[0], nm = name.value.trim();
      const lines = [`Oi, Point! ${nm ? `Aqui é ${nm}. ` : ''}Vim pelo site.`];
      if (obj) lines.push(`Objetivo: ${obj.toLowerCase()}`);
      if (mod.length) lines.push(`Quero: ${mod.join(', ')}`);
      if (per) lines.push(`Horário: ${per.toLowerCase()}`);
      if (app) lines.push(app.startsWith('Não') ? 'Quero saber dos planos da Point' : `Tenho ${app}`);
      if (lines.length === 1) lines.push('Quero saber dos planos e horários das aulas.');
      const msg = lines.join('\n');
      preview.textContent = msg;
      send.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    }
    build();
    preview.textContent = 'Escolha as opções acima e a sua mensagem aparece aqui.';
  }
})();

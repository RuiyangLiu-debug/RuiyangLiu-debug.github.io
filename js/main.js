(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const navHeight = () => $('.site-nav').offsetHeight;

  const onScroll = [];
  let ticking = false;
  const runScroll = () => { ticking = false; onScroll.forEach((fn) => fn()); };
  const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initIntro();
    initTitleDraw();
    initHeroTrajectory();
    initNav();
    initProgress();
    initVideos();
    initTilt();
    initMagnetic();
    initFilters();
    initAnchors();
    initReveal();
    initParallax();
    initJourney();
    initVideoModal();
    initMobileMenu();
    initEmail();
    initSearch();
    initPubDemos();
    initVisitors();
    runScroll();
  });

  function initVisitors() {
    const box = $('.visitors');
    if (!box || !window.fetch) return;
    const code = box.dataset.goatcounterCode;
    const nums = $$('[data-gc-path]', box);
    const format = (n) => Math.round(n).toLocaleString('en-US');

    const read = (el) => {
      const url = new URL(`https://${code}.goatcounter.com/counter/${encodeURIComponent(el.dataset.gcPath)}.json`);
      if (el.dataset.gcStart) url.searchParams.set('start', el.dataset.gcStart);
      return fetch(url, { mode: 'cors' })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((d) => Number(String(d.count).replace(/[^\d]/g, '')) || 0);
    };

    const renderLocations = () => {
      const data = window.VISITOR_LOCATIONS;
      const wrap = $('.visitor-locations', box);
      if (!wrap || !data || !Array.isArray(data.items) || !data.items.length) return [];
      const isLocal = location.protocol === 'file:' || /^(localhost|127\.|\[?::1\]?$)/.test(location.hostname);
      if (data.sample && !isLocal) return [];
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const sorted = [...data.items].sort((a, b) => b.count - a.count);
      const rows = sorted.slice(0, 6).map((x) => ({ code: x.code, name: x.name, count: x.count }));
      const others = (data.others || 0) + sorted.slice(6).reduce((s, x) => s + x.count, 0);
      if (others > 0) rows.push({ code: '··', name: 'Others', count: others, others: true });
      const max = Math.max(...rows.map((r) => r.count));
      $('.loc-list', wrap).innerHTML = rows.map((r, i) => `
        <li class="loc-row${r.others ? ' loc-others' : ''}">
          <span class="loc-code">${esc(r.code)}</span>
          <span class="loc-name" title="${esc(r.name)}">${esc(r.name)}</span>
          <span class="loc-bar"><span style="--w:${((r.count / max) * 100).toFixed(1)}%;--d:${(i * 0.06).toFixed(2)}s"></span></span>
          <span class="loc-count">${Math.round(r.count).toLocaleString('en-US')}</span>
        </li>`).join('');
      $('.loc-badge', wrap).hidden = !data.sample;
      wrap.hidden = false;
      return $$('.loc-bar span', wrap);
    };

    Promise.all(nums.map(read))
      .then((values) => {
        nums.forEach((el, i) => { el.dataset.target = values[i]; });
        const bars = renderLocations();
        box.hidden = false;
        const showFinal = () => nums.forEach((el) => { el.textContent = format(el.dataset.target); });
        if (reduceMotion || !('IntersectionObserver' in window)) { showFinal(); return; }
        bars.forEach((b) => b.style.setProperty('--s', '0'));
        const io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          bars.forEach((b) => b.style.setProperty('--s', '1'));
          const start = performance.now();
          const step = (now) => {
            const t = clamp((now - start) / 1400, 0, 1);
            const k = 1 - Math.pow(1 - t, 4);
            nums.forEach((el) => { el.textContent = format(Number(el.dataset.target) * k); });
            if (t < 1) requestAnimationFrame(step); else showFinal();
          };
          requestAnimationFrame(step);
        }, { threshold: 0.4 });
        io.observe(box);
      })
      .catch(() => {
      });
  }

  const demoControls = new Map();
  function initPubDemos() {
    const panels = $$('.pub-demo');
    if (!panels.length) return;
    const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };

    panels.forEach((panel) => {
      const videos = $$('video', panel);
      const toggles = $$(`[aria-controls="${panel.id}"]`);
      const isOpen = () => panel.classList.contains('is-open');

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (!isOpen()) return;
            if (e.isIntersecting) play(e.target); else e.target.pause();
          });
        }, { threshold: 0.2 });
        videos.forEach((v) => io.observe(v));
      }

      const article = panel.closest('.pub');
      const thumbVideo = article && $('.pub-thumb video', article);
      const setOpen = (open) => {
        panel.classList.toggle('is-open', open);
        toggles.forEach((t) => t.setAttribute('aria-expanded', String(open)));
        if (article) article.classList.toggle('demo-open', open);
        if (thumbVideo) {
          if (open) thumbVideo.pause();
          else if (!reduceMotion) { const p = thumbVideo.play(); if (p) p.catch(() => {}); }
        }
        if (open) {
          videos.forEach((v) => { v.preload = 'auto'; play(v); });
          setTimeout(() => {
            const r = panel.getBoundingClientRect();
            const overflow = r.bottom - window.innerHeight + 16;
            if (overflow > 0) window.scrollBy({ top: Math.min(overflow, r.top - navHeight() - 16), behavior: reduceMotion ? 'auto' : 'smooth' });
          }, reduceMotion ? 0 : 450);
        } else {
          videos.forEach((v) => v.pause());
        }
      };

      toggles.forEach((t) => t.addEventListener('click', () => setOpen(!panel.classList.contains('is-open'))));
      demoControls.set(panel, setOpen);
    });
  }

  function initSearch() {
    const dialog = $('.search-modal');
    const toggle = $('.search-toggle');
    if (!dialog || !toggle) return;
    if (typeof dialog.showModal !== 'function') { toggle.hidden = true; return; }
    const input = $('#search-input', dialog);
    const list = $('#search-results', dialog);
    const empty = $('.search-empty', dialog);

    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
      $$('.search-foot kbd', dialog).forEach((k) => { if (k.textContent === 'Ctrl') k.textContent = '⌘'; });
      toggle.title = 'Search (⌘K)';
    }

    const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const tags = (el) => (el ? [...el.children].map(text).join(' · ') : '');
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const entries = [];
    const add = (type, title, body, el, target = el, flash = el) => {
      entries.push({ type, title, body, target, flash, t: norm(title), h: norm(`${title} ${body} ${el.dataset.search || ''}`) });
    };
    const bio = $('.intro-bio');
    if (bio) add('About', 'Ruiyang Liu', text(bio), bio, $('.intro'), bio);
    const feat = $('.feat-intro');
    if (feat) add('Featured', text($('.feat-title', feat)), `${tags($('.badges', feat))} · ${text($('.authors', feat))} · ${text($('.feat-summary', feat))}`, feat, $('#quadhand'), feat);
    $$('.exp-grid .media').forEach((f) => add('Experiment', text($('figcaption', f)), 'QuadHand experiment video (IROS 2026)', f));
    $$('.pub').forEach((p) => add('Publication', text($('.pub-title', p)), `${tags($('.pub-venue', p))} · ${text($('.authors', p))} · ${text($('.pub-desc', p))}`, p, p, $('.pub-body', p)));
    $$('.project').forEach((p) => add('Project', text($('.project-title', p)), `${tags($('.badges', p))} · ${text($('.project-desc', p))} ${$$('figcaption', p).map(text).join(' · ')}`, p));
    $$('.j-item').forEach((j) => add('Journey', text($('h4', j)), `${text($('.j-date', j))} · ${text($('.j-org', j))} · ${text($('.j-note', j))}`, j, j, $('.j-card', j)));

    const search = (terms) => entries
      .map((e, i) => {
        if (!terms.every((t) => e.h.includes(t))) return null;
        const score = terms.reduce((s, t) => s + (e.t.includes(t) ? 3 : 1) + (e.t.startsWith(t) ? 1 : 0), 0);
        return { e, score, i };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 8)
      .map((r) => r.e);

    const highlight = (str, terms) => {
      const html = esc(str);
      if (!terms.length) return html;
      const re = new RegExp(`(${terms.map((t) => reEsc(esc(t))).join('|')})`, 'gi');
      return html.replace(re, '<mark>$1</mark>');
    };
    const snippet = (body, terms) => {
      const low = body.toLowerCase();
      let pos = -1;
      for (const t of terms) { pos = low.indexOf(t); if (pos >= 0) break; }
      const start = pos < 0 ? 0 : Math.max(0, pos - 50);
      return (start > 0 ? '…' : '') + body.slice(start, start + 160) + (start + 160 < body.length ? '…' : '');
    };

    const suggestions = ['QuadHand', 'IROS 2026', 'swarm', 'VLA', 'KEENON', 'NTU', '智能车'];
    let results = [];
    let active = 0;

    const setActive = (i) => {
      const items = $$('.search-result', list);
      if (!items.length) return;
      active = (i + items.length) % items.length;
      items.forEach((li, k) => {
        li.classList.toggle('is-active', k === active);
        li.setAttribute('aria-selected', String(k === active));
      });
      input.setAttribute('aria-activedescendant', `sr-${active}`);
      items[active].scrollIntoView({ block: 'nearest' });
    };

    const render = () => {
      const q = input.value;
      const terms = norm(q).split(' ').filter(Boolean);
      results = terms.length ? search(terms) : [];
      active = 0;
      list.innerHTML = results.map((e, i) => `
        <li class="search-result${i === 0 ? ' is-active' : ''}" role="option" id="sr-${i}" aria-selected="${i === 0}" data-i="${i}" style="--i:${i}">
          <span class="res-type">${e.type}</span>
          <span class="res-title">${highlight(e.title, terms)}</span>
          <span class="res-snippet">${highlight(snippet(e.body, terms), terms)}</span>
        </li>`).join('');
      if (results.length) input.setAttribute('aria-activedescendant', 'sr-0');
      else input.removeAttribute('aria-activedescendant');
      if (!terms.length) {
        empty.innerHTML = `Search papers, experiments, projects, and experience.
          <div class="search-suggest">${suggestions.map((s) => `<button type="button">${esc(s)}</button>`).join('')}</div>`;
      } else if (!results.length) {
        empty.textContent = `No results for “${q.trim()}”.`;
      } else {
        empty.innerHTML = '';
      }
    };

    const open = () => {
      if (dialog.open) return;
      closeMobileMenu();
      dialog.showModal();
      render();
      input.focus();
      input.select();
    };

    const go = (entry) => {
      if (!entry) return;
      dialog.close();
      let wait = 30;
      if (entry.target.classList.contains('pub') && entry.target.classList.contains('is-hidden')) {
        applyFilter('all');
        wait = reduceMotion ? 30 : 600;
      }
      setTimeout(() => scrollToEl(entry.target, entry.flash), wait);
    };

    toggle.addEventListener('click', open);
    $('.search-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.search-result');
      if (li) go(results[Number(li.dataset.i)]);
    });
    list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.search-result');
      if (li && Number(li.dataset.i) !== active) setActive(Number(li.dataset.i));
    });
    empty.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      input.value = btn.textContent;
      render();
      input.focus();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.open) dialog.close(); else open();
        return;
      }
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === '/' && !typing && !dialog.open && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    });
  }

  function initEmail() {
    $$('[data-email-user]').forEach((a) => {
      const address = `${a.dataset.emailUser}@${a.dataset.emailDomain}`;
      a.href = `mailto:${address}`;
      a.setAttribute('aria-label', `Send an email to ${address}`);
    });
  }

  function initTheme() {
    const toggle = $('.theme-toggle');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const effective = () => root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
    const sync = () => {
      const theme = effective();
      root.setAttribute('data-theme-effective', theme);
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    };
    toggle.addEventListener('click', () => {
      const next = effective() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
      toggle.classList.remove('is-spinning');
      void toggle.offsetWidth;
      toggle.classList.add('is-spinning');
    });
    systemDark.addEventListener('change', sync);
    sync();
  }

  let introStarted = false;
  const introCallbacks = [];
  const onIntro = (fn) => { if (introStarted) fn(); else introCallbacks.push(fn); };
  const startIntro = () => {
    if (introStarted) return;
    introStarted = true;
    root.classList.add('is-loaded');
    introCallbacks.forEach((fn) => fn());
  };

  function initIntro() {
    void document.body.offsetHeight;
    startIntro();
  }

  function initTitleDraw() {
    const h1 = $('.hero-title');
    const span = h1 && $('.title-text', h1);
    if (!span) return;
    if (reduceMotion) { h1.classList.add('title-done'); return; }

    const build = () => {
      if (h1.classList.contains('title-done')) return;
      const cs = getComputedStyle(span);
      const text = span.textContent;
      const mark = document.createElement('span');
      mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      span.appendChild(mark);
      const baseline = mark.offsetTop;
      mark.remove();
      const w = span.offsetWidth;
      const h = span.offsetHeight;

      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'title-draw');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', 0);
      t.setAttribute('y', baseline);
      t.textContent = text;
      t.style.fontSize = cs.fontSize;
      const dash = Math.round(parseFloat(cs.fontSize) * 4.2);
      t.style.strokeDasharray = `${dash}`;
      t.style.setProperty('--dash', `${dash}`);
      svg.appendChild(t);
      span.appendChild(svg);
      span.style.animation = 'none';

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        h1.classList.add('title-done');
        span.style.animation = '';
        svg.remove();
      };
      t.addEventListener('animationend', (e) => { if (e.animationName === 'title-fill') finish(); });
      setTimeout(finish, 2800);
      void svg.getBoundingClientRect();
      svg.classList.add('is-drawing');
    };

    const fontReady = document.fonts && document.fonts.load
      ? Promise.race([document.fonts.load(`600 ${getComputedStyle(span).fontSize} "Space Grotesk"`), new Promise((r) => setTimeout(r, 700))])
      : Promise.resolve();
    fontReady.then(build, build);
  }

  function initHeroTrajectory() {
    const path = $('.hero-traj-path');
    const drone = $('.hero-drone');
    if (!path || !drone) return;
    const length = path.getTotalLength();
    const place = (t) => {
      const p = path.getPointAtLength(length * t);
      drone.setAttribute('transform', `translate(${p.x} ${p.y})`);
    };
    if (reduceMotion) { place(1); drone.classList.add('is-hovering'); return; }

    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    place(0);
    const duration = 2600;
    const delay = 700;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    onIntro(() => {
      const start = performance.now() + delay;
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const e = ease(t);
        path.style.strokeDashoffset = `${length * (1 - e)}`;
        place(e);
        if (t < 1) requestAnimationFrame(step);
        else drone.classList.add('is-hovering');
      };
      requestAnimationFrame(step);
      if (document.hidden) {
        path.style.strokeDashoffset = '0';
        place(1);
        drone.classList.add('is-hovering');
      }
    });
  }

  function initNav() {
    const nav = $('.site-nav');
    const links = $$('.nav-links a');
    const indicator = $('.nav-indicator');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);

    const update = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      const y = window.scrollY + navHeight() + window.innerHeight * 0.25;
      let current = sections[0];
      sections.forEach((s) => { if (s.offsetTop <= y) current = s; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1];
      }
      links.forEach((a) => {
        const active = a.getAttribute('href') === `#${current.id}`;
        a.classList.toggle('is-active', active);
        if (active && indicator && a.offsetWidth) {
          indicator.style.width = `${a.offsetWidth - 24}px`;
          indicator.style.transform = `translateX(${a.offsetLeft + 12}px)`;
        }
      });
    };
    onScroll.push(update);
  }

  function initProgress() {
    const bar = $('.progress span');
    onScroll.push(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    });
  }

  function initVideos() {
    const videos = $$('video[data-autoplay]');
    if (reduceMotion) {
      videos.forEach((v) => { if (!v.closest('a')) v.controls = true; });
      return;
    }
    const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };
    if (!('IntersectionObserver' in window)) { videos.forEach(play); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && !e.target.closest('.pub.demo-open')) play(e.target); else e.target.pause(); });
    }, { threshold: 0.2 });
    videos.forEach((v) => io.observe(v));
  }

  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) scale(1.015)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
        btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  function scrollToEl(el, flashEl = el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    const top = y - navHeight() - 16;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    const flash = () => {
      flashEl.classList.remove('is-flash');
      void flashEl.offsetWidth;
      flashEl.classList.add('is-flash');
      setTimeout(() => flashEl.classList.remove('is-flash'), 1700);
    };
    if (reduceMotion) return;
    if ('onscrollend' in window) {
      let done = false;
      const finish = () => { if (!done) { done = true; window.removeEventListener('scrollend', finish); flash(); } };
      window.addEventListener('scrollend', finish);
      setTimeout(finish, 1200);
    } else {
      setTimeout(flash, 700);
    }
  }

  let applyFilter = () => {};
  function initFilters() {
    const chips = $$('.chip');
    const drone = $('.chip-drone');
    const filters = $$('.filter');
    const indicator = $('.filter-indicator');
    const pubs = $$('.pub');
    const bento = $('#bento');
    const tiles = $$('.tile', bento);

    const moveDrone = (chip, hop) => {
      if (!drone || !chip) return;
      const x = chip.offsetLeft + chip.offsetWidth / 2 - 12;
      drone.style.transform = `translateX(${x}px)`;
      if (hop && !reduceMotion) {
        drone.classList.remove('is-hopping');
        void drone.offsetWidth;
        drone.classList.add('is-hopping');
      }
    };
    const moveIndicator = (btn) => {
      if (!indicator || !btn) return;
      indicator.style.width = `${btn.offsetWidth}px`;
      indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
    };

    const matches = (el, cat) => cat === 'all' || el.dataset.cats.split(' ').includes(cat);

    const highlightTopic = (cat, hop = false) => {
      tiles.forEach((t) => t.classList.toggle('is-match', matches(t, cat)));
      bento.classList.toggle('is-filtered', cat !== 'all');
      chips.forEach((c) => c.classList.toggle('is-active', c.dataset.filter === cat));
      moveDrone(chips.find((c) => c.dataset.filter === cat), hop);
    };

    applyFilter = (cat) => {
      pubs.forEach((p) => {
        const hide = !matches(p, cat);
        p.classList.toggle('is-hidden', hide);
        const panel = $('.pub-demo.is-open', p);
        if (hide && panel && demoControls.has(panel)) demoControls.get(panel)(false);
      });
      filters.forEach((f) => f.classList.toggle('is-active', f.dataset.filter === cat));
      moveIndicator(filters.find((f) => f.dataset.filter === cat));
    };

    chips.forEach((chip) => chip.addEventListener('click', () => highlightTopic(chip.dataset.filter, true)));
    filters.forEach((f) => f.addEventListener('click', () => {
      applyFilter(f.dataset.filter);
      const bar = f.parentElement;
      if (bar.scrollWidth > bar.clientWidth) {
        bar.scrollTo({ left: f.offsetLeft - (bar.clientWidth - f.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }));

    highlightTopic('all');
    applyFilter('all');
    window.addEventListener('resize', () => {
      moveDrone($('.chip.is-active'));
      moveIndicator($('.filter.is-active'));
    });
    document.fonts && document.fonts.ready.then(() => {
      moveDrone($('.chip.is-active'));
      moveIndicator($('.filter.is-active'));
    });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-video-open')) return;
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      if (target.classList.contains('pub') && target.classList.contains('is-hidden')) applyFilter('all');
      const isSection = target.tagName === 'SECTION';
      scrollToEl(target, isSection ? (target.querySelector('.section-head') || target) : (target.querySelector('.pub-body') || target));
      history.replaceState(null, '', a.getAttribute('href'));
    });
  }

  function initReveal() {
    $$('[data-stagger]').forEach((group) => {
      $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`));
    });
    const els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const targetOf = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (targetOf.get(e.target) || []).forEach((el) => el.classList.add('is-in'));
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => {
      const watched = el.dataset.reveal === 'wipe' ? el.parentElement : el;
      if (!targetOf.has(watched)) targetOf.set(watched, []);
      targetOf.get(watched).push(el);
      io.observe(watched);
    });
  }

  function initParallax() {
    if (reduceMotion) return;
    const imgs = $$('[data-parallax]');
    onScroll.push(() => {
      imgs.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const progress = (r.top + r.height / 2) / window.innerHeight - 0.5;
        img.style.setProperty('--py', `${(-progress * 36).toFixed(1)}px`);
      });
    });
  }

  function initJourney() {
    const list = $('.journey-list');
    if (!list) return;
    const svg = $('.journey-svg', list);
    const track = $('.track', svg);
    const trail = $('.trail', svg);
    const drone = $('.journey-drone', list);
    const items = $$('.j-item', list);
    let samples = [];
    let length = 0;
    let nodeYs = [];

    const build = () => {
      const pts = items.map((item) => {
        const node = $('.j-node', item);
        return { x: node.offsetLeft + node.offsetWidth / 2, y: item.offsetTop + node.offsetTop + node.offsetHeight / 2 };
      });
      nodeYs = pts.map((p) => p.y);
      const first = pts[0];
      const last = pts[pts.length - 1];
      let d = `M ${first.x} ${first.y - 34} L ${first.x} ${first.y}`;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1];
        const b = pts[i];
        const midY = (a.y + b.y) / 2;
        d += ` C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
      }
      d += ` L ${last.x} ${last.y + 34}`;
      track.setAttribute('d', d);
      trail.setAttribute('d', d);
      length = trail.getTotalLength();
      trail.style.strokeDasharray = `${length}`;
      samples = [];
      for (let i = 0; i <= 240; i += 1) {
        const l = (length * i) / 240;
        samples.push({ l, y: trail.getPointAtLength(l).y });
      }
      update();
    };

    const update = () => {
      if (!samples.length) return;
      if (reduceMotion) {
        trail.style.strokeDashoffset = '0';
        items.forEach((it) => it.classList.add('is-reached'));
        return;
      }
      const rect = list.getBoundingClientRect();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const focusY = atBottom ? Infinity : window.innerHeight * 0.7 - rect.top;
      let drawn = 0;
      for (const s of samples) { if (s.y <= focusY) drawn = s.l; else break; }
      trail.style.strokeDashoffset = `${length - drawn}`;
      const p = trail.getPointAtLength(drawn);
      drone.style.transform = `translate(${p.x}px, ${p.y}px)`;
      drone.classList.toggle('is-visible', drawn > 0 && drawn < length);
      items.forEach((it, i) => it.classList.toggle('is-reached', nodeYs[i] <= focusY));
    };

    build();
    onScroll.push(update);
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); });
    document.fonts && document.fonts.ready.then(build);
    window.addEventListener('load', build);
  }

  function initVideoModal() {
    const dialog = $('.video-modal');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const video = $('video', dialog);
    $$('[data-video-open]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault();
      const src = btn.getAttribute('href');
      if (video.getAttribute('src') !== src) {
        video.setAttribute('src', src);
        if (btn.dataset.videoPoster) video.setAttribute('poster', btn.dataset.videoPoster);
        else video.removeAttribute('poster');
      }
      dialog.showModal();
      const p = video.play();
      if (p) p.catch(() => {});
    }));
    $('.modal-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => video.pause());
  }

  function closeMobileMenu() {
    const btn = $('.menu-toggle');
    const menu = $('#mobile-menu');
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('is-open');
  }
  function initMobileMenu() {
    const btn = $('.menu-toggle');
    const menu = $('#mobile-menu');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileMenu(); });
  }
})();

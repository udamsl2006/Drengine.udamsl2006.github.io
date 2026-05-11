
;(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? module.exports = factory()
    : typeof define === 'function' && define.amd
    ? define(factory)
    : (global = typeof globalThis !== 'undefined' ? globalThis : global || self,
       global.Drengine = factory());
}(this, function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // CORE UTILITIES  (Drengine.Reality)
  // ─────────────────────────────────────────────────────────────────────────
  const Reality = {
    version: '1.0.0',

    /** Inject the Drengine CSS stylesheet into <head> */
    injectStyles(href = 'drengine.css') {
      if (document.querySelector(`link[data-drengine]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-drengine', '');
      document.head.appendChild(link);
    },

    /** Query helper */
    $(sel, ctx = document) { return ctx.querySelector(sel); },
    $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },

    /** Deep merge objects */
    merge(...objs) {
      return objs.reduce((acc, o) => {
        Object.keys(o).forEach(k => {
          acc[k] = (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]))
            ? Reality.merge(acc[k] || {}, o[k])
            : o[k];
        });
        return acc;
      }, {});
    },

    /** Clamp a number between min and max */
    clamp(v, min, max) { return Math.min(Math.max(v, min), max); },

    /** Linear interpolation */
    lerp(a, b, t) { return a + (b - a) * t; },

    /** Generate a random float in [min, max] */
    rand(min = 0, max = 1) { return Math.random() * (max - min) + min; },

    /** Ease functions */
    ease: {
      inOutCubic: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
      inOutElastic: t => {
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1
          : t < 0.5 ? -(Math.pow(2, 20*t-10) * Math.sin((20*t-11.125)*c5)) / 2
          : (Math.pow(2, -20*t+10) * Math.sin((20*t-11.125)*c5)) / 2 + 1;
      },
      outBack: t => {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      },
      dreamWave: t => Math.sin(t * Math.PI) * (1 - Math.cos(t * Math.PI * 2)) / 2 + t * 0.5,
    },

    /** requestAnimationFrame loop with delta time */
    loop(cb) {
      let last = null;
      const tick = ts => {
        const dt = last ? (ts - last) / 1000 : 0;
        last = ts;
        cb(dt, ts);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return tick;
    },

    /** Animate a value over time */
    animate({ from, to, duration = 600, ease = Reality.ease.inOutCubic, onUpdate, onDone }) {
      const start = performance.now();
      const run = (now) => {
        const t = Reality.clamp((now - start) / duration, 0, 1);
        onUpdate(Reality.lerp(from, to, ease(t)), t);
        if (t < 1) requestAnimationFrame(run);
        else onDone && onDone();
      };
      requestAnimationFrame(run);
    },

    /** Create and append an element */
    createElement(tag, attrs = {}, parent = null) {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      if (attrs.style) Object.assign(el.style, attrs.style);
      if (attrs.className) el.className = attrs.className;
      if (parent) parent.appendChild(el);
      return el;
    },

    /** Observe element intersection */
    observe(el, cb, opts = {}) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => cb(e.isIntersecting, e));
      }, { threshold: 0.15, ...opts });
      io.observe(el);
      return io;
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 1 — MORPH  (Fluid morphing UI)
  // ─────────────────────────────────────────────────────────────────────────
  const Morph = {
    /**
     * Apply blob morphing animation to an element.
     * The border-radius continuously mutates giving a living-organism feel.
     *
     * @param {HTMLElement|string} target
     * @param {object} opts
     *   speed    {number} — animation speed multiplier (default 1)
     *   colors   {string[]} — gradient colors to cycle through
     *   intensity{number} — morph wildness 0–1 (default 0.6)
     */
    blob(target, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      const cfg = Reality.merge({
        speed: 1,
        colors: ['#ff6ec7', '#a855f7', '#3b82f6', '#06b6d4'],
        intensity: 0.6,
        duration: 8000,
      }, opts);

      el.classList.add('drn-blob');

      let frame = 0;
      let colorIdx = 0;
      let nextColorIdx = 1;
      let colorT = 0;

      const lerp = Reality.lerp.bind(Reality);
      const clamp = Reality.clamp.bind(Reality);

      function randomRadius(intensity) {
        const b = () => clamp(40 + Reality.rand(-40, 40) * intensity, 20, 80);
        return `${b()}% ${100-b()}% ${100-b()}% ${b()}% / ${b()}% ${b()}% ${100-b()}% ${100-b()}%`;
      }

      let radii = [randomRadius(cfg.intensity), randomRadius(cfg.intensity)];
      let radiiT = 0;
      let radiiDuration = Reality.rand(3000, 6000);
      let lastTime = null;

      function hexToRgb(hex) {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [0,0,0];
      }

      function lerpColor(a, b, t) {
        const ca = hexToRgb(a), cb = hexToRgb(b);
        return `rgb(${Math.round(lerp(ca[0],cb[0],t))},${Math.round(lerp(ca[1],cb[1],t))},${Math.round(lerp(ca[2],cb[2],t))})`;
      }

      const tick = (ts) => {
        const dt = lastTime ? (ts - lastTime) : 16;
        lastTime = ts;

        radiiT += dt / radiiDuration * cfg.speed;
        colorT  += dt / 4000 * cfg.speed;

        if (radiiT >= 1) {
          radiiT = 0;
          radii[0] = radii[1];
          radii[1] = randomRadius(cfg.intensity);
          radiiDuration = Reality.rand(3000, 6000);
        }

        if (colorT >= 1) {
          colorT = 0;
          colorIdx = nextColorIdx;
          nextColorIdx = (nextColorIdx + 1) % cfg.colors.length;
        }

        const ease = Reality.ease.inOutCubic(radiiT);
        // We can only interpolate the numbers inside the radius string
        // so we just switch at the eased threshold
        el.style.borderRadius = ease < 0.5 ? radii[0] : radii[1];

        const c1 = lerpColor(cfg.colors[colorIdx], cfg.colors[nextColorIdx], colorT);
        const c2 = lerpColor(cfg.colors[(colorIdx+2) % cfg.colors.length],
                             cfg.colors[(nextColorIdx+2) % cfg.colors.length], colorT);
        el.style.background = `radial-gradient(ellipse at 30% 40%, ${c1}, ${c2})`;

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return { el, stop: () => { /* RAF auto-stops if we remove the element */ } };
    },

    /**
     * Morph text from one string to another character by character.
     *
     * @param {HTMLElement|string} target
     * @param {string} newText
     * @param {object} opts
     */
    text(target, newText, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      const cfg = Reality.merge({ duration: 600, chars: '░▒▓█▉▊▋▌▍▎▏', }, opts);
      const oldText = el.textContent;
      const maxLen = Math.max(oldText.length, newText.length);
      const chars = cfg.chars.split('');
      let start = null;

      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / cfg.duration, 1);

        let result = '';
        for (let i = 0; i < maxLen; i++) {
          const charProgress = Reality.clamp((progress * maxLen - i) / 3, 0, 1);
          if (charProgress < 0.33) {
            result += oldText[i] || '';
          } else if (charProgress < 0.66) {
            result += chars[Math.floor(Math.random() * chars.length)];
          } else {
            result += newText[i] || '';
          }
        }
        el.textContent = result;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    /**
     * FLIP animation — smoothly move/resize an element from one state to another.
     * Pass a callback that changes the DOM; Drengine handles the animation.
     *
     * @param {HTMLElement|string} target
     * @param {function} changeFn — makes the DOM change
     * @param {object} opts
     */
    flip(target, changeFn, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) { changeFn(); return; }
      const cfg = Reality.merge({ duration: 500, ease: Reality.ease.outBack }, opts);

      const first = el.getBoundingClientRect();
      changeFn();
      const last  = el.getBoundingClientRect();

      const dx = first.left - last.left;
      const dy = first.top  - last.top;
      const sw = first.width / last.width;
      const sh = first.height / last.height;

      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})`;
      el.style.transformOrigin = '0 0';
      el.style.transition = 'none';

      requestAnimationFrame(() => {
        el.style.transition = `transform ${cfg.duration}ms cubic-bezier(0.34,1.56,0.64,1)`;
        el.style.transform = 'none';
        setTimeout(() => {
          el.style.transition = '';
          el.style.transformOrigin = '';
        }, cfg.duration);
      });
    },

    /**
     * Ripple morph — creates an ink-drop ripple from a click point.
     *
     * @param {HTMLElement|string} target
     * @param {MouseEvent} event
     */
    ripple(target, event) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (event?.clientX ?? rect.left + rect.width/2) - rect.left;
      const y = (event?.clientY ?? rect.top + rect.height/2) - rect.top;
      const maxR = Math.hypot(
        Math.max(x, rect.width - x),
        Math.max(y, rect.height - y)
      ) * 2.2;

      const ripple = Reality.createElement('span', {
        className: 'drn-ripple',
        style: {
          left: `${x}px`, top: `${y}px`,
          '--r': `${maxR}px`,
        }
      }, el);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 2 — GLASS  (Glassmorphism)
  // ─────────────────────────────────────────────────────────────────────────
  const Glass = {
    /**
     * Apply glassmorphism styling to one or more elements.
     *
     * @param {string|HTMLElement|NodeList} targets
     * @param {object} opts
     *   blur      {number} — backdrop blur in px (default 18)
     *   opacity   {number} — glass opacity 0–1 (default 0.15)
     *   tint      {string} — tint color (default 'rgba(255,255,255,0.12)')
     *   border    {string} — border style
     *   shadow    {string} — box-shadow
     *   shine     {boolean} — add animated inner shine (default true)
     *   depth     {'flat'|'raised'|'sunken'} — perceived depth
     */
    apply(targets, opts = {}) {
      const cfg = Reality.merge({
        blur: 18, opacity: 0.15,
        tint: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
        shadow: '0 8px 32px rgba(0,0,0,0.25)',
        shine: true,
        depth: 'raised',
        animated: false,
      }, opts);

      const els = typeof targets === 'string'
        ? Reality.$$(targets)
        : targets instanceof NodeList ? [...targets]
        : [targets];

      els.forEach(el => {
        el.classList.add('drn-glass', `drn-glass--${cfg.depth}`);
        el.style.setProperty('--drn-blur', `${cfg.blur}px`);
        el.style.setProperty('--drn-tint', cfg.tint);
        el.style.setProperty('--drn-border', cfg.border);
        el.style.setProperty('--drn-shadow', cfg.shadow);
        if (cfg.shine) el.classList.add('drn-glass--shine');
        if (cfg.animated) el.classList.add('drn-glass--animated');

        // Parallax tilt on hover
        el.addEventListener('mousemove', (e) => Glass._tilt(el, e));
        el.addEventListener('mouseleave', () => Glass._resetTilt(el));
      });
    },

    _tilt(el, e) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      el.style.transform = `perspective(600px) rotateY(${dx*8}deg) rotateX(${-dy*8}deg) scale(1.02)`;
    },

    _resetTilt(el) {
      el.style.transform = '';
    },

    /**
     * Create a Glass Panel element and append to parent.
     *
     * @param {object} opts — extends apply() opts +
     *   title    {string}
     *   content  {string} — innerHTML
     *   parent   {HTMLElement|string}
     *   width    {string}
     *   height   {string}
     */
    panel(opts = {}) {
      const cfg = Reality.merge({
        title: '', content: '', width: '320px', height: 'auto',
        parent: document.body, x: null, y: null,
      }, opts);

      const parent = typeof cfg.parent === 'string' ? Reality.$(cfg.parent) : cfg.parent;
      const panel = Reality.createElement('div', { className: 'drn-glass-panel' }, parent);
      panel.style.width = cfg.width;
      panel.style.height = cfg.height;
      if (cfg.x !== null) panel.style.left = typeof cfg.x === 'number' ? cfg.x + 'px' : cfg.x;
      if (cfg.y !== null) panel.style.top  = typeof cfg.y === 'number' ? cfg.y + 'px' : cfg.y;

      if (cfg.title) {
        const h = Reality.createElement('div', { className: 'drn-glass-panel__title', innerHTML: cfg.title }, panel);
      }
      if (cfg.content) {
        const c = Reality.createElement('div', { className: 'drn-glass-panel__body', innerHTML: cfg.content }, panel);
      }

      Glass.apply(panel, opts);
      return panel;
    },

    /**
     * Refraction layer — puts a blurred, color-shifted "lens" over a section.
     *
     * @param {HTMLElement|string} target
     */
    refract(target, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      el.classList.add('drn-refract');
      const cfg = Reality.merge({ hue: 200, saturation: 80 }, opts);
      el.style.setProperty('--drn-hue', cfg.hue);
      el.style.setProperty('--drn-sat', `${cfg.saturation}%`);
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 3 — NEUMORPHISM
  // ─────────────────────────────────────────────────────────────────────────
  const Neumorphism = {
    /**
     * Apply neumorphism to elements.
     *
     * @param {string|HTMLElement|NodeList} targets
     * @param {object} opts
     *   bg       {string} — base background color (default '#e0e5ec')
     *   light    {string} — light shadow color
     *   dark     {string} — dark shadow color
     *   distance {number} — shadow distance (default 8)
     *   blur     {number} — shadow blur (default 20)
     *   type     {'flat'|'concave'|'convex'|'pressed'} (default 'flat')
     *   interactive {boolean} — toggle pressed on click (default false)
     */
    apply(targets, opts = {}) {
      const cfg = Reality.merge({
        bg: '#e0e5ec',
        light: '#ffffff',
        dark: '#a3b1c6',
        distance: 8,
        blur: 20,
        type: 'flat',
        interactive: false,
      }, opts);

      const els = typeof targets === 'string'
        ? Reality.$$(targets)
        : targets instanceof NodeList ? [...targets]
        : [targets];

      els.forEach(el => {
        el.classList.add('drn-neumorphic', `drn-neumorphic--${cfg.type}`);
        el.style.setProperty('--neu-bg',    cfg.bg);
        el.style.setProperty('--neu-light', cfg.light);
        el.style.setProperty('--neu-dark',  cfg.dark);
        el.style.setProperty('--neu-dist',  `${cfg.distance}px`);
        el.style.setProperty('--neu-blur',  `${cfg.blur}px`);

        if (cfg.interactive) {
          el.addEventListener('mousedown', () => {
            el.classList.remove('drn-neumorphic--flat','drn-neumorphic--convex','drn-neumorphic--concave');
            el.classList.add('drn-neumorphic--pressed');
          });
          el.addEventListener('mouseup', () => {
            el.classList.remove('drn-neumorphic--pressed');
            el.classList.add(`drn-neumorphic--${cfg.type}`);
          });
          el.addEventListener('mouseleave', () => {
            el.classList.remove('drn-neumorphic--pressed');
            el.classList.add(`drn-neumorphic--${cfg.type}`);
          });
        }
      });
    },

    /**
     * Create a fully styled Neumorphic card.
     *
     * @param {object} opts
     *   parent, title, content, icon, width, ...apply opts
     */
    card(opts = {}) {
      const cfg = Reality.merge({
        parent: document.body, title: '', content: '', icon: '',
        width: '260px', padding: '2rem',
      }, opts);

      const parent = typeof cfg.parent === 'string' ? Reality.$(cfg.parent) : cfg.parent;
      const card = Reality.createElement('div', { className: 'drn-neu-card' }, parent);
      card.style.width = cfg.width;
      card.style.padding = cfg.padding;

      if (cfg.icon) Reality.createElement('div', { className: 'drn-neu-card__icon', innerHTML: cfg.icon }, card);
      if (cfg.title) Reality.createElement('div', { className: 'drn-neu-card__title', innerHTML: cfg.title }, card);
      if (cfg.content) Reality.createElement('div', { className: 'drn-neu-card__body', innerHTML: cfg.content }, card);

      Neumorphism.apply(card, opts);
      return card;
    },

    /**
     * Neumorphic range slider — takes an <input type="range"> and skins it.
     *
     * @param {string|HTMLElement} target
     */
    slider(target, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      el.classList.add('drn-neu-slider');
      Neumorphism.apply(el, Reality.merge({ type: 'concave', blur: 12, distance: 4 }, opts));
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 4 — FLOAT  (Floating / levitating objects)
  // ─────────────────────────────────────────────────────────────────────────
  const Float = {
    /**
     * Make an element levitate (smooth up/down float).
     *
     * @param {HTMLElement|string} target
     * @param {object} opts
     *   amplitude {number} — px to float by (default 18)
     *   period    {number} — ms per cycle (default 3000)
     *   rotate    {boolean} — subtle rotation (default true)
     *   shadow    {boolean} — animated shadow (default true)
     *   phase     {number} — starting phase 0–2π
     */
    levitate(target, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      const cfg = Reality.merge({
        amplitude: 18, period: 3000,
        rotate: true, shadow: true,
        phase: Reality.rand(0, Math.PI * 2),
        easeX: 1,
      }, opts);

      el.classList.add('drn-float');
      if (cfg.shadow) el.classList.add('drn-float--shadow');

      let start = null;
      const tick = (ts) => {
        if (!start) start = ts;
        const t = ((ts - start) / cfg.period) * Math.PI * 2 + cfg.phase;
        const y = Math.sin(t) * cfg.amplitude;
        const r = cfg.rotate ? Math.sin(t * 0.7) * 2.5 : 0;
        const scale = cfg.shadow ? Reality.lerp(0.95, 1.05, (Math.sin(t) + 1) / 2) : 1;

        el.style.transform = `translateY(${y}px) rotate(${r}deg)`;
        if (cfg.shadow) {
          const shadowY = Reality.lerp(10, 30, (Math.sin(t) + 1) / 2);
          const shadowBlur = Reality.lerp(8, 40, (Math.sin(t) + 1) / 2);
          const shadowOp = Reality.lerp(0.35, 0.12, (Math.sin(t) + 1) / 2);
          el.style.filter = `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowOp}))`;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    /**
     * Spawn floating particles in a container.
     *
     * @param {HTMLElement|string} container
     * @param {object} opts
     *   count    {number} — number of particles (default 30)
     *   shapes   {string[]} — emoji or SVG strings
     *   colors   {string[]}
     *   minSize, maxSize  {number} — px
     *   minSpeed, maxSpeed {number} — px/s
     *   drift    {boolean} — gentle horizontal drift
     */
    particles(container, opts = {}) {
      const wrap = typeof container === 'string' ? Reality.$(container) : container;
      if (!wrap) return;
      const cfg = Reality.merge({
        count: 30, shapes: ['●', '◆', '▲', '★', '✦', '◉'],
        colors: ['#f472b6','#818cf8','#34d399','#fbbf24','#60a5fa'],
        minSize: 8, maxSize: 22,
        minSpeed: 30, maxSpeed: 90,
        drift: true,
      }, opts);

      wrap.classList.add('drn-particles-wrap');
      const particles = [];

      for (let i = 0; i < cfg.count; i++) {
        const p = Reality.createElement('span', { className: 'drn-particle' }, wrap);
        const size  = Reality.rand(cfg.minSize, cfg.maxSize);
        const shape = cfg.shapes[Math.floor(Reality.rand(0, cfg.shapes.length))];
        const color = cfg.colors[Math.floor(Reality.rand(0, cfg.colors.length))];
        const speed = Reality.rand(cfg.minSpeed, cfg.maxSpeed);
        const x     = Reality.rand(0, 100); // %
        const driftDir = Reality.rand(-1, 1);

        p.textContent = shape;
        p.style.cssText = `
          left:${x}%;
          bottom:-${size*2}px;
          font-size:${size}px;
          color:${color};
          opacity:${Reality.rand(0.4, 0.9)};
        `;

        particles.push({ el: p, size, speed, x, drift: driftDir, phase: Reality.rand(0, Math.PI*2) });
      }

      const h = wrap.offsetHeight || 600;
      const starts = particles.map(() => Reality.rand(0, h));
      let last = null;

      const tick = (ts) => {
        const dt = last ? (ts - last) / 1000 : 0;
        last = ts;
        particles.forEach((p, i) => {
          starts[i] += p.speed * dt;
          if (starts[i] > h + 40) starts[i] = -20;
          const driftX = cfg.drift ? Math.sin(ts / 2000 + p.phase) * 30 : 0;
          p.el.style.transform = `translateY(-${starts[i]}px) translateX(${driftX}px)`;
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    /**
     * Make elements react to cursor proximity (magnetic float).
     *
     * @param {string|HTMLElement|NodeList} targets
     * @param {object} opts
     *   radius   {number} — effect radius in px (default 120)
     *   strength {number} — pull strength 0–1 (default 0.4)
     */
    magnetic(targets, opts = {}) {
      const cfg = Reality.merge({ radius: 120, strength: 0.4 }, opts);
      const els = typeof targets === 'string'
        ? Reality.$$(targets)
        : targets instanceof NodeList ? [...targets]
        : [targets];

      document.addEventListener('mousemove', (e) => {
        els.forEach(el => {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < cfg.radius) {
            const force = (1 - dist / cfg.radius) * cfg.strength;
            el.style.transform = `translate(${dx * force}px, ${dy * force}px)`;
          } else {
            el.style.transform = '';
          }
        });
      });
    },

    /**
     * 3D parallax depth — elements at different data-depth levels move on tilt/cursor.
     *
     * @param {HTMLElement|string} scene — wrapping container
     */
    parallax(scene, opts = {}) {
      const wrap = typeof scene === 'string' ? Reality.$(scene) : scene;
      if (!wrap) return;
      const cfg = Reality.merge({ strength: 25, gyro: true }, opts);

      const layers = Reality.$$('[data-depth]', wrap);

      const apply = (rx, ry) => {
        layers.forEach(l => {
          const d = parseFloat(l.dataset.depth) || 0.5;
          l.style.transform = `translate(${ry * cfg.strength * d}px, ${rx * cfg.strength * d}px)`;
        });
      };

      document.addEventListener('mousemove', (e) => {
        const rx = (e.clientY / window.innerHeight - 0.5);
        const ry = (e.clientX / window.innerWidth  - 0.5);
        apply(rx, ry);
      });

      if (cfg.gyro && window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
          const rx = Reality.clamp((e.beta  - 30) / 30, -1, 1) * 0.5;
          const ry = Reality.clamp( e.gamma        / 30, -1, 1) * 0.5;
          apply(rx, ry);
        });
      }
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 5 — DREAM  (Surreal page / section transitions)
  // ─────────────────────────────────────────────────────────────────────────
  const Dream = {
    _overlay: null,
    _pages: {},
    _current: null,

    /**
     * Initialize the Dream transition system.
     * Creates a full-screen overlay used for transitions.
     */
    init() {
      if (this._overlay) return;
      const ov = Reality.createElement('div', { className: 'drn-dream-overlay' }, document.body);
      this._overlay = ov;

      // Collect data-page elements
      Reality.$$('[data-page]').forEach(el => {
        this._pages[el.dataset.page] = el;
      });
    },

    /**
     * Transition between two data-page="x" elements.
     *
     * @param {string} to — page id
     * @param {string} type — 'dissolve'|'vortex'|'melt'|'shatter'|'void' (default 'dissolve')
     */
    go(to, type = 'dissolve') {
      if (!this._overlay) this.init();
      const outEl = this._current ? this._pages[this._current] : null;
      const inEl  = this._pages[to];
      if (!inEl) return console.warn(`[Drengine.Dream] No page with id "${to}"`);

      const ov = this._overlay;
      ov.className = `drn-dream-overlay drn-dream--${type}`;
      ov.classList.add('drn-dream-overlay--in');

      setTimeout(() => {
        if (outEl) outEl.style.display = 'none';
        inEl.style.display = '';
        this._current = to;

        ov.classList.remove('drn-dream-overlay--in');
        ov.classList.add('drn-dream-overlay--out');

        setTimeout(() => {
          ov.classList.remove('drn-dream-overlay--out');
          ov.className = 'drn-dream-overlay';
        }, 900);
      }, 600);
    },

    /**
     * Animate elements into view as they enter the viewport.
     * Add data-dream-in="fade|rise|bloom|glitch|warp" to elements.
     */
    revealOnScroll() {
      Reality.$$('[data-dream-in]').forEach(el => {
        el.classList.add('drn-reveal');
        Reality.observe(el, (visible) => {
          if (visible) el.classList.add(`drn-reveal--${el.dataset.dreamIn}`, 'drn-revealed');
        });
      });
    },

    /**
     * Scramble cursor — replaces cursor with a trailing dream cursor.
     *
     * @param {object} opts
     *   color  {string}
     *   trail  {number} — number of trailing dots
     */
    cursor(opts = {}) {
      const cfg = Reality.merge({ color: '#a855f7', trail: 8, size: 14 }, opts);
      document.documentElement.style.cursor = 'none';

      const cursor = Reality.createElement('div', { className: 'drn-cursor' }, document.body);
      cursor.style.setProperty('--cursor-color', cfg.color);
      cursor.style.setProperty('--cursor-size', `${cfg.size}px`);

      const trail = Array.from({ length: cfg.trail }, (_, i) => {
        const t = Reality.createElement('div', { className: 'drn-cursor-trail' }, document.body);
        t.style.opacity = (1 - i / cfg.trail) * 0.6;
        t.style.transform = `scale(${1 - i / cfg.trail * 0.7})`;
        return t;
      });

      const positions = Array(cfg.trail).fill({ x: -100, y: -100 });
      let mx = -100, my = -100;

      document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

      Reality.loop(() => {
        cursor.style.left = `${mx}px`;
        cursor.style.top  = `${my}px`;
        positions.unshift({ x: mx, y: my });
        positions.length = cfg.trail;
        trail.forEach((t, i) => {
          t.style.left = `${positions[i]?.x ?? mx}px`;
          t.style.top  = `${positions[i]?.y ?? my}px`;
        });
      });

      document.addEventListener('mousedown', () => cursor.classList.add('drn-cursor--pressed'));
      document.addEventListener('mouseup', () => cursor.classList.remove('drn-cursor--pressed'));
    },

    /**
     * Apply a glitch effect to an element.
     *
     * @param {HTMLElement|string} target
     * @param {object} opts
     *   intensity {number} 0–1
     *   loop      {boolean}
     */
    glitch(target, opts = {}) {
      const el = typeof target === 'string' ? Reality.$(target) : target;
      if (!el) return;
      const cfg = Reality.merge({ intensity: 0.5, loop: false, duration: 800 }, opts);
      el.classList.add('drn-glitch');
      el.dataset.text = el.textContent;
      el.style.setProperty('--glitch-int', cfg.intensity);

      if (cfg.loop) {
        const trigger = () => {
          el.classList.add('drn-glitch--active');
          setTimeout(() => {
            el.classList.remove('drn-glitch--active');
            setTimeout(trigger, Reality.rand(2000, 6000));
          }, cfg.duration);
        };
        trigger();
      } else {
        el.classList.add('drn-glitch--active');
        setTimeout(() => el.classList.remove('drn-glitch--active'), cfg.duration);
      }
    },

    /**
     * Warp transition — warps the page like a dream dissolving.
     * Applies a CSS filter animation to the body.
     *
     * @param {function} cb — runs at peak warp
     */
    warp(cb) {
      document.body.classList.add('drn-warp-out');
      setTimeout(() => {
        cb && cb();
        document.body.classList.remove('drn-warp-out');
        document.body.classList.add('drn-warp-in');
        setTimeout(() => document.body.classList.remove('drn-warp-in'), 700);
      }, 500);
    },
  };


  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-INIT
  // ─────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-levitate
    Reality.$$('[data-drn-float]').forEach(el => {
      const opts = {};
      if (el.dataset.drnFloat) try { Object.assign(opts, JSON.parse(el.dataset.drnFloat)); } catch(e){}
      Float.levitate(el, opts);
    });

    // Auto-glass
    Reality.$$('[data-drn-glass]').forEach(el => {
      const opts = {};
      if (el.dataset.drnGlass) try { Object.assign(opts, JSON.parse(el.dataset.drnGlass)); } catch(e){}
      Glass.apply(el, opts);
    });

    // Auto-neumorphic
    Reality.$$('[data-drn-neu]').forEach(el => {
      const opts = {};
      if (el.dataset.drnNeu) try { Object.assign(opts, JSON.parse(el.dataset.drnNeu)); } catch(e){}
      Neumorphism.apply(el, opts);
    });

    // Auto-blob
    Reality.$$('[data-drn-blob]').forEach(el => {
      Morph.blob(el);
    });

    // Auto-reveal
    if (Reality.$$('[data-dream-in]').length) {
      Dream.revealOnScroll();
    }

    // Auto-pages
    Reality.$$('[data-page]').forEach((el, i) => {
      if (i > 0) el.style.display = 'none';
    });
    if (Reality.$$('[data-page]').length) {
      Dream.init();
      const firstPage = Reality.$('[data-page]');
      if (firstPage) Dream._current = firstPage.dataset.page;
    }

    // Auto-navigate links
    Reality.$$('[data-go]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const [pageId, type] = (btn.dataset.go).split(':');
        Dream.go(pageId, type || 'dissolve');
      });
    });
  });


  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  return {
    version: Reality.version,
    Reality,
    Morph,
    Glass,
    Neumorphism,
    Float,
    Dream,
  };
}));

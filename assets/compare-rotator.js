/* Competitor rotator for the comparison tables.

   Tables marked <table class="cmp-table" data-rotate> normally show every competitor as its own
   column. With JS on, each shows one competitor at a time (plus Aielia, the reference, where the
   table has that column), cycling every INTERVAL ms. All marked tables share one selection, so the
   page stays consistent as you scroll between them.

   The rotation stops (or holds) when you want it to:
     - clicking a competitor stops it on that competitor until you press Resume
     - hovering or keyboard-focusing a table holds it while you read
     - touching a table holds it for HOLD_AFTER_TOUCH ms
     - it also holds while the tab is hidden or no table is on screen
     - with prefers-reduced-motion it never starts by itself
   Without JS the page is unchanged: every column visible, scroll sideways. */
(function () {
  'use strict';

  var INTERVAL = 8000;          // how long each competitor stays up (ms) — keep within 5000–10000
  var TICK = 100;
  var HOLD_AFTER_TOUCH = 12000;

  var tables = [].slice.call(document.querySelectorAll('table.cmp-table[data-rotate]'));
  if (!tables.length || !document.querySelector) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var seconds = Math.round(INTERVAL / 1000);

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // Reads the competitor columns (everything except the row-label column and the Aielia column).
  function readAgents(table) {
    var head = table.tHead && table.tHead.rows[0];
    if (!head) return [];
    var agents = [];
    [].slice.call(head.cells).forEach(function (th, i) {
      if (i === 0 || th.classList.contains('col-aielia')) return;
      var label = th.querySelector('.agent-label');
      var dot = th.querySelector('.dot');
      var name = (label || th).textContent.replace(/\s+/g, ' ').trim();
      agents.push({ index: i, name: name, key: slug(name), color: dot ? getComputedStyle(dot).backgroundColor : '' });
    });
    return agents;
  }

  var views = [];   // one per table: { cells: {key: [td...]}, chips: {key: button}, ctrl, fill, ... }
  var order = [];   // competitors, in column order of the first table

  tables.forEach(function (table) {
    var agents = readAgents(table);
    if (agents.length < 2) return;
    if (!order.length) order = agents.map(function (a) { return { key: a.key, name: a.name, color: a.color }; });

    // Tag every cell in a competitor column so it can be hidden/shown as a group.
    var cells = {};
    agents.forEach(function (a) { cells[a.key] = []; });
    [].slice.call(table.rows).forEach(function (row) {
      agents.forEach(function (a) {
        var cell = row.cells[a.index];
        if (!cell) return;
        cell.setAttribute('data-agent', a.key);
        cells[a.key].push(cell);
      });
    });

    var wrap = table.closest('.table-scroll') || table;
    var hasRef = !!(table.tHead && table.tHead.querySelector('th.col-aielia'));

    // Controls: [Aielia vs] (Hermes) (Kilo) ... [Pause]  + progress bar
    var ctrl = document.createElement('div');
    ctrl.className = 'cmp-rot';
    ctrl.setAttribute('role', 'group');
    ctrl.setAttribute('aria-label', hasRef ? 'Compare Aielia against one competitor at a time' : 'Show one competitor at a time');

    var vs = document.createElement('span');
    vs.className = 'cmp-rot__vs';
    vs.textContent = hasRef ? 'Aielia vs' : 'Competitor:';
    ctrl.appendChild(vs);

    var chipWrap = document.createElement('div');
    chipWrap.className = 'cmp-rot__chips';
    var chips = {};
    agents.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cmp-rot__chip';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('data-key', a.key);
      if (a.color) b.style.setProperty('--chip-color', a.color);
      var d = document.createElement('span');
      d.className = 'dot';
      if (a.color) d.style.background = a.color;
      b.appendChild(d);
      b.appendChild(document.createTextNode(a.name));
      chips[a.key] = b;
      chipWrap.appendChild(b);
    });
    ctrl.appendChild(chipWrap);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cmp-rot__toggle';
    ctrl.appendChild(toggle);

    var bar = document.createElement('div');
    bar.className = 'cmp-rot__bar';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('span');
    fill.className = 'cmp-rot__fill';
    bar.appendChild(fill);
    ctrl.appendChild(bar);

    var status = document.createElement('span');
    status.className = 'cmp-rot__status';
    status.setAttribute('role', 'status');
    ctrl.appendChild(status);

    // The existing "scroll sideways" hint (just above the table) no longer applies.
    var hint = wrap.previousElementSibling;
    wrap.parentNode.insertBefore(ctrl, wrap);
    if (hint && hint.classList.contains('table-hint')) {
      hint.textContent = (hasRef ? 'One competitor at a time against Aielia' : 'One competitor at a time') +
        ' — rotates every ' + seconds + ' s. Click a name to stop on it, or hover to hold.';
    }

    table.setAttribute('data-rotating', '');
    views.push({ table: table, wrap: wrap, ctrl: ctrl, cells: cells, chips: chips, toggle: toggle, fill: fill, status: status, hover: false, focus: false, visible: true });
  });

  if (!views.length) return;

  var active = 0;
  var stopped = reduceMotion;   // user (or reduced-motion) has stopped auto-rotation
  var elapsed = 0;
  var holdUntil = 0;

  function show(i, announce) {
    active = (i + order.length) % order.length;
    var key = order[active].key;
    views.forEach(function (v) {
      Object.keys(v.cells).forEach(function (k) {
        v.cells[k].forEach(function (c) { c.hidden = (k !== key); });
      });
      Object.keys(v.chips).forEach(function (k) { v.chips[k].setAttribute('aria-pressed', k === key ? 'true' : 'false'); });
      v.ctrl.style.setProperty('--bar-color', order[active].color || '');
      if (announce) v.status.textContent = 'Showing ' + order[active].name;
    });
    elapsed = 0;
    paint();
  }

  function paint() {
    var pct = stopped ? 0 : Math.min(100, (elapsed / INTERVAL) * 100);
    views.forEach(function (v) {
      v.fill.style.width = pct + '%';
      v.ctrl.setAttribute('data-state', stopped ? 'paused' : 'playing');
      v.toggle.textContent = stopped ? '▶ Resume rotation' : '⏸ Pause';
      v.toggle.setAttribute('aria-label', stopped ? 'Resume automatic rotation through competitors' : 'Pause automatic rotation');
    });
  }

  function userPick(i) {
    stopped = true;           // choosing a competitor stops the rotation until Resume
    show(i, true);
  }

  views.forEach(function (v) {
    Object.keys(v.chips).forEach(function (k) {
      v.chips[k].addEventListener('click', function () {
        for (var i = 0; i < order.length; i++) if (order[i].key === k) { userPick(i); break; }
      });
      v.chips[k].addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        userPick(active + d);
        v.chips[order[active].key].focus();
      });
    });
    v.toggle.addEventListener('click', function () {
      stopped = !stopped;
      elapsed = 0;
      paint();
      v.status.textContent = stopped ? 'Rotation paused' : 'Rotation resumed';
    });

    // Hold while the reader is on the table or its controls (mouse), or tabbing through the table's
    // own links (keyboard). The controls themselves never hold on focus: a button keeps focus after
    // it is clicked, which would freeze the rotation right after pressing Resume.
    [v.ctrl, v.wrap].forEach(function (el) {
      el.addEventListener('mouseenter', function () { v.hover = true; });
      el.addEventListener('mouseleave', function () { v.hover = false; });
      el.addEventListener('touchstart', function () { holdUntil = Date.now() + HOLD_AFTER_TOUCH; }, { passive: true });
    });
    v.wrap.addEventListener('focusin', function () { v.focus = true; });
    v.wrap.addEventListener('focusout', function () { v.focus = false; });
  });

  // Only run while at least one table is on screen.
  if ('IntersectionObserver' in window) {
    var onScreen = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen.set(en.target, en.isIntersecting); });
      views.forEach(function (v) { v.visible = !!(onScreen.get(v.ctrl) || onScreen.get(v.wrap)); });
    }, { threshold: 0 });
    views.forEach(function (v) { v.visible = false; io.observe(v.ctrl); io.observe(v.wrap); });
  }

  function held() {
    if (Date.now() < holdUntil) return true;
    for (var i = 0; i < views.length; i++) if (views[i].hover || views[i].focus) return true;
    return false;
  }

  setInterval(function () {
    if (stopped || document.hidden || held()) return;
    var anyVisible = views.some(function (v) { return v.visible; });
    if (!anyVisible) return;
    elapsed += TICK;
    if (elapsed >= INTERVAL) show(active + 1, false);
    else paint();
  }, TICK);

  show(0, false);
})();

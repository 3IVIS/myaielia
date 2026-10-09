/* Faceoff page: Aielia's transcript on the left, one other agent's on the right, rotating through the others.

   Data: /assets/faceoff/index.json (scenarios, blurbs, grades) and /assets/faceoff/NN.json (one scenario's transcripts),
   written by benchmarking/site/export_faceoff.py. Nothing on this page is typed in by hand except the copy in the HTML
   and the grades/one-line reasons in the data.

   Rotation (same rules as the comparison page): every INTERVAL ms the right-hand agent changes. It holds while you
   hover or focus the transcripts, after you pick an agent (until you press Resume), after you touch or scroll
   inside the grid, while the tab is hidden or the grid is off screen, and with prefers-reduced-motion it never starts
   by itself. The URL hash (#05 or #05-codex) selects a scenario and an agent and can be shared. */
(function () {
  'use strict';

  var INTERVAL = 12000;            // longer than the table rotator: these are transcripts, people read
  var TICK = 100;
  var HOLD_AFTER_TOUCH = 20000;
  var BASE = '/assets/faceoff/';
  var VERSION = document.currentScript && document.currentScript.getAttribute('data-v') || '';

  var root = document.getElementById('faceoff');
  if (!root) return;

  var COLORS = {
    aielia: 'var(--series-aielia)', claude: 'var(--series-claude)', pi: 'var(--series-pi)',
    codex: 'var(--series-codex)', cline: 'var(--series-cline)', kilo: 'var(--series-kilo)'
  };
  var GRADE_TXT = { ok: 'Met it', partial: 'Partly', fail: 'Failed' };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var index = null, cache = {}, scen = null, agents = [], cur = 0;
  var state = { elapsed: 0, held: false, stopped: false, touchUntil: 0, visible: true };
  var els = {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function url(name) { return BASE + name + '.json' + (VERSION ? '?v=' + VERSION : ''); }
  function get(name) {
    if (cache[name]) return Promise.resolve(cache[name]);
    return fetch(url(name)).then(function (r) {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.json();
    }).then(function (j) { cache[name] = j; return j; });
  }

  /* ---- tiny, safe markdown: fences, `code`, **bold**, paragraphs ---- */
  function inline(s) {
    return esc(s).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  }
  function md(text) {
    var out = [], parts = text.split(/```[a-zA-Z]*\n?/);
    parts.forEach(function (p, i) {
      if (i % 2) { out.push('<pre><code>' + esc(p.replace(/\n$/, '')) + '</code></pre>'); return; }
      p.split(/\n{2,}/).forEach(function (para) {
        para = para.replace(/^\s+|\s+$/g, '');
        if (!para) return;
        var lines = para.split('\n');
        if (lines.every(function (l) { return /^\s*([-*]|\d+\.)\s/.test(l); })) {
          out.push('<p>' + lines.map(function (l) { return inline(l.replace(/^\s*/, '')); }).join('<br>') + '</p>');
        } else {
          out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
        }
      });
    });
    return out.join('');
  }

  /* ---- statistics block ---- */
  function renderStats() {
    var box = document.getElementById('fo-bars');
    if (!box) return;
    var order = index.harnesses.map(function (h) { return h.key; });
    var tot = {};
    order.forEach(function (k) { tot[k] = { ok: 0, partial: 0, fail: 0, n: 0, segs: [] }; });
    index.scenarios.forEach(function (s) {
      order.forEach(function (k) {
        var c = s.grades[k];
        if (!c) return;
        tot[k][c.g]++; tot[k].n++; tot[k].segs.push({ g: c.g, n: s.n, t: s.title, w: c.w });
      });
    });
    var fails = 0, cells = 0;
    order.forEach(function (k) { fails += tot[k].fail; cells += tot[k].n; });
    var nf = document.getElementById('fo-stat-fail');
    if (nf) nf.textContent = fails + ' / ' + cells;

    var rows = box.querySelector('.fo-bar-rows');
    rows.textContent = '';
    index.harnesses.forEach(function (h) {
      var t = tot[h.key];
      var row = el('div', 'fo-bar-row');
      var lab = el('div', 'fo-bar-label');
      var dot = el('span', 'fo-dot'); dot.style.background = COLORS[h.key];
      lab.appendChild(dot); lab.appendChild(document.createTextNode(h.label));
      var track = el('div', 'fo-bar-track');
      t.segs.forEach(function (sg) {
        var seg = el('span', 'fo-seg ' + sg.g);
        seg.title = sg.n + ' ' + sg.t + ' — ' + GRADE_TXT[sg.g];
        track.appendChild(seg);
      });
      var cnt = el('div', 'fo-bar-count', t.ok + ' met · ' + t.partial + ' partly · ' + t.fail + ' failed');
      row.appendChild(lab); row.appendChild(track); row.appendChild(cnt);
      rows.appendChild(row);
    });
  }

  /* ---- scenario picker ---- */
  function renderPicker() {
    var wrap = document.getElementById('fo-pills');
    wrap.textContent = '';
    index.scenarios.forEach(function (s) {
      var b = el('button', 'fo-pill', s.n);
      b.type = 'button';
      b.title = s.n + ' · ' + s.title;
      b.setAttribute('aria-label', 'Scenario ' + s.n + ': ' + s.title);
      b.setAttribute('data-n', s.n);
      b.addEventListener('click', function () { openScenario(s.n, null, true); });
      wrap.appendChild(b);
    });
  }
  function markPicker(n) {
    [].forEach.call(document.querySelectorAll('.fo-pill'), function (b) {
      if (b.getAttribute('data-n') === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  /* ---- one agent's cell of a turn ---- */
  function sayNode(text) {
    var recAt = text.indexOf('[Recorded by the system');
    var body = recAt > 0 ? text.slice(0, recAt).replace(/\s+$/, '') : text;
    var rec = recAt > 0 ? text.slice(recAt).replace(/^\[|\]$/g, '') : '';
    var box = el('div', 'fo-say');
    var inner = el('div', 'fo-say-body');
    inner.innerHTML = md(body);
    box.appendChild(inner);
    if (body.length > 900) {
      box.classList.add('clamped');
      var more = el('button', 'fo-more', 'Show the whole reply');
      more.type = 'button';
      more.addEventListener('click', function () {
        var open = box.classList.toggle('clamped');
        more.textContent = open ? 'Show the whole reply' : 'Show less';
        state.touchUntil = Date.now() + HOLD_AFTER_TOUCH;
      });
      box.appendChild(more);
    }
    if (rec) box.appendChild(el('div', 'fo-rec', 'Appended by the harness: ' + rec));
    return box;
  }
  function toolsNode(calls) {
    var d = el('details', 'fo-tools');
    var errs = calls.filter(function (c) { return c.ok === false; }).length;
    d.appendChild(el('summary', null, calls.length + ' tool call' + (calls.length === 1 ? '' : 's') + (errs ? ' (' + errs + ' failed)' : '')));
    calls.forEach(function (c) {
      var row = el('div', 'fo-call' + (c.ok === false ? ' err' : ''));
      var h = el('div', 'fo-call-h');
      var b = el('b', null, c.n); h.appendChild(b); h.appendChild(document.createTextNode(c.a));
      row.appendChild(h);
      if (c.r) row.appendChild(el('div', 'fo-call-r', c.r));
      d.appendChild(row);
    });
    d.addEventListener('toggle', function () { state.touchUntil = Date.now() + HOLD_AFTER_TOUCH; });
    return d;
  }
  function fillCell(cell, turn, label) {
    cell.textContent = '';
    cell.appendChild(el('div', 'fo-side-label', label));
    if (!turn.sent) {
      cell.appendChild(el('div', 'fo-empty', 'This agent folded this message into the previous turn.'));
      return;
    }
    var says = 0;
    turn.items.forEach(function (it) {
      if (it.t === 'say') { says++; cell.appendChild(sayNode(it.x)); }
      else if (it.t === 'tools') cell.appendChild(toolsNode(it.calls));
      else if (it.t === 'note') cell.appendChild(el('div', 'fo-note', it.x));
    });
    if (!says) cell.appendChild(el('div', 'fo-empty bad', 'No reply to this message.'));
  }

  function paneHead(c, key) {
    var h = el('div', 'fo-pane-head');
    h.style.setProperty('--pc', COLORS[key]);
    var name = el('div', 'fo-pane-name');
    name.appendChild(document.createTextNode(c.label));
    name.appendChild(el('span', 'fo-grade ' + c.g, GRADE_TXT[c.g]));
    h.appendChild(name);
    var s = c.stats || {};
    var meta = c.version + ' · ' + s.tools + ' tool calls' + (s.approvals ? ' · ' + s.approvals + ' approvals asked' : '');
    h.appendChild(el('div', 'fo-pane-meta', meta));
    h.appendChild(el('p', 'fo-why', c.w));
    if (c.checks && c.checks.length) {
      var d = el('details', 'fo-checks');
      var pass = c.checks.filter(function (x) { return x.s === 'pass'; }).length;
      d.appendChild(el('summary', null, 'Automatic checks: ' + pass + ' of ' + c.checks.length + ' passed'));
      var ul = el('ul');
      c.checks.forEach(function (x) {
        var li = el('li');
        li.appendChild(el('span', x.s === 'pass' ? 'p' : 'f', x.s === 'pass' ? '✓ ' : '✗ '));
        li.appendChild(document.createTextNode(x.l));
        ul.appendChild(li);
      });
      d.appendChild(ul);
      h.appendChild(d);
    }
    return h;
  }

  /* ---- the grid ---- */
  function buildGrid() {
    var grid = els.grid;
    grid.textContent = '';
    els.leftHead = el('div'); els.rightHead = el('div');
    grid.appendChild(els.leftHead); grid.appendChild(els.rightHead);
    els.leftCells = []; els.rightCells = [];
    scen.turns.forEach(function (t, i) {
      var th = el('div', 'fo-turn');
      var u = el('div', 'fo-user');
      u.appendChild(el('div', 'fo-user-l', 'You · message ' + (i + 1) + ' of ' + scen.turns.length));
      u.appendChild(el('div', 'fo-user-t', t));
      th.appendChild(u);
      grid.appendChild(th);
      var l = el('div', 'fo-cell'), r = el('div', 'fo-cell');
      grid.appendChild(l); grid.appendChild(r);
      els.leftCells.push(l); els.rightCells.push(r);
    });
    var a = scen.cells.aielia;
    els.leftHead.replaceWith(paneHead(a, 'aielia'));
    els.leftHead = grid.children[0];
    scen.turns.forEach(function (t, i) { fillCell(els.leftCells[i], a.turns[i], 'Aielia'); });
  }
  function showAgent(i, animate) {
    cur = i;
    var key = agents[i], c = scen.cells[key];
    var head = paneHead(c, key);
    if (animate) head.classList.add('fo-fade');
    els.rightHead.replaceWith(head);
    els.rightHead = head;
    scen.turns.forEach(function (t, k) {
      fillCell(els.rightCells[k], c.turns[k], c.label);
      if (animate) { els.rightCells[k].classList.remove('fo-fade'); void els.rightCells[k].offsetWidth; els.rightCells[k].classList.add('fo-fade'); }
    });
    [].forEach.call(els.chips.querySelectorAll('.fo-chip'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-k') === key ? 'true' : 'false');
    });
    els.ctrl.style.setProperty('--bar-color', COLORS[key]);
    els.status.textContent = 'Showing ' + c.label + '.';
    state.elapsed = 0;
    setFill(0);
  }
  function buildChips() {
    els.chips.textContent = '';
    agents.forEach(function (key, i) {
      var c = scen.cells[key];
      var b = el('button', 'fo-chip');
      b.type = 'button';
      b.setAttribute('data-k', key);
      b.style.setProperty('--chip-color', COLORS[key]);
      var dot = el('span', 'fo-dot'); dot.style.background = COLORS[key];
      var g = el('span', 'fo-g ' + c.g); g.style.background = c.g === 'ok' ? 'var(--ok)' : c.g === 'fail' ? 'var(--fail)' : '#d9a21b';
      g.title = GRADE_TXT[c.g];
      b.appendChild(dot); b.appendChild(document.createTextNode(c.label)); b.appendChild(g);
      b.addEventListener('click', function () { stop(); showAgent(i, true); setHash(); });
      els.chips.appendChild(b);
    });
  }

  /* ---- rotation ---- */
  function setFill(p) { els.fill.style.width = Math.min(100, Math.max(0, p)) + '%'; }
  function stop() {
    state.stopped = true;
    els.toggle.textContent = 'Resume';
    els.toggle.setAttribute('aria-pressed', 'true');
    els.ctrl.setAttribute('data-state', 'paused');
  }
  function resume() {
    state.stopped = false; state.elapsed = 0;
    els.toggle.textContent = 'Pause';
    els.toggle.setAttribute('aria-pressed', 'false');
    els.ctrl.removeAttribute('data-state');
  }
  function tick() {
    if (!scen || state.stopped) return;
    if (document.hidden || !state.visible || state.held || Date.now() < state.touchUntil) return;
    state.elapsed += TICK;
    setFill(state.elapsed / INTERVAL * 100);
    if (state.elapsed >= INTERVAL) showAgent((cur + 1) % agents.length, true);
  }

  /* ---- open a scenario ---- */
  function setHash() {
    if (!scen) return;
    var h = '#' + scen.n + (state.stopped ? '-' + agents[cur] : '');
    if (history.replaceState) history.replaceState(null, '', h); else location.hash = h;
  }
  function openScenario(n, agentKey, userInitiated) {
    var meta = index.scenarios.filter(function (s) { return s.n === n; })[0];
    if (!meta) return;
    markPicker(n);
    els.title.textContent = meta.title;
    els.num.textContent = 'Scenario ' + meta.n + ' of ' + index.scenarios.length;
    els.blurb.textContent = '';
    meta.blurb.forEach(function (p) { els.blurb.appendChild(el('p', null, p)); });
    els.pending = n;
    els.grid.textContent = ''; els.grid.appendChild(el('div', 'fo-loading', 'Loading transcripts…'));
    get(n).then(function (data) {
      if (els.pending !== n) return;
      scen = data;
      agents = index.harnesses.map(function (h) { return h.key; }).filter(function (k) { return k !== 'aielia' && data.cells[k]; });
      buildGrid(); buildChips();
      var start = agentKey && agents.indexOf(agentKey) >= 0 ? agents.indexOf(agentKey) : 0;
      showAgent(start, false);
      if (agentKey || reduceMotion) stop(); else resume();
      if (userInitiated) setHash();
    }).catch(function () {
      els.grid.textContent = '';
      els.grid.appendChild(el('div', 'fo-loading', 'Could not load this scenario. Reload the page to try again.'));
    });
  }

  function init() {
    els.title = document.getElementById('fo-title'); els.num = document.getElementById('fo-num');
    els.blurb = document.getElementById('fo-blurb'); els.grid = document.getElementById('fo-grid');
    els.ctrl = document.getElementById('fo-ctrl'); els.chips = document.getElementById('fo-chips');
    els.fill = document.getElementById('fo-fill'); els.status = document.getElementById('fo-status');
    els.toggle = document.getElementById('fo-toggle');

    els.toggle.addEventListener('click', function () {
      if (state.stopped) resume(); else stop();
      setHash();
    });
    els.grid.addEventListener('mouseenter', function () { state.held = true; });
    els.grid.addEventListener('mouseleave', function () { state.held = false; });
    els.grid.addEventListener('focusin', function () { state.held = true; });
    els.grid.addEventListener('focusout', function () { state.held = false; });
    els.grid.addEventListener('touchstart', function () { state.touchUntil = Date.now() + HOLD_AFTER_TOUCH; }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { state.visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(els.grid);
    }
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (!index || !scen || e.altKey || e.ctrlKey || e.metaKey) return;
      var ns = index.scenarios.map(function (s) { return s.n; }), i = ns.indexOf(scen.n);
      if (e.key === '[' && i > 0) openScenario(ns[i - 1], null, true);
      if (e.key === ']' && i < ns.length - 1) openScenario(ns[i + 1], null, true);
    });
    window.setInterval(tick, TICK);
    window.addEventListener('hashchange', function () { applyHash(true); });

    get('index').then(function (j) {
      index = j;
      renderStats(); renderPicker();
      applyHash(false);
    }).catch(function () {
      root.querySelector('.fo-loading').textContent = 'The faceoff data could not be loaded. Reload the page to try again.';
    });
  }
  function applyHash(user) {
    var m = /^#(\d\d)(?:-([a-z]+))?$/.exec(location.hash || '');
    var n = m && index.scenarios.some(function (s) { return s.n === m[1]; }) ? m[1] : index.scenarios[0].n;
    var key = m && m[2] || null;
    if (scen && scen.n === n && !user) return;
    openScenario(n, key, false);
  }
  init();
})();

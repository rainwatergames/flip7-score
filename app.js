(function () {
  'use strict';
  var FS = window.FlipScore;
  var KEY = 'flipScore.v1';
  var COLORS = ['#9aa3ad','#ff4d5e','#ff8a1f','#ffd21f','#7ddf3a','#19c48a','#16c7d9','#3d8bff','#7a5cff','#c552ff','#ff4fb8','#ff6f3c','#2fe0a0'];

  function $(id) { return document.getElementById(id); }
  function fresh() { return { players: [], target: 200, rounds: [], hands: {}, sel: null, nextId: 1 }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.players)) return Object.assign(fresh(), s); } catch (e) {}
    return fresh();
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function hand(id) { if (!S.hands[id]) S.hands[id] = FS.emptyHand(); return S.hands[id]; }
  function totals() {
    var t = {};
    S.players.forEach(function (p) { t[p.id] = 0; });
    S.rounds.forEach(function (r) { for (var id in r) if (id in t) t[id] += r[id].score; });
    return t;
  }
  function leaders(t) {
    var best = -Infinity, ids = [];
    S.players.forEach(function (p) { if (t[p.id] > best) { best = t[p.id]; ids = [p.id]; } else if (t[p.id] === best) ids.push(p.id); });
    return { best: best, ids: ids };
  }
  function isOver(t) {
    if (!S.rounds.length || !S.players.length) return false;
    return S.players.some(function (p) { return t[p.id] >= S.target; });
  }
  function nameOf(id) { var p = S.players.find(function (p) { return String(p.id) === String(id); }); return p ? p.name : '?'; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---- build cards once ----
  var numWrap = $('numCards'), modWrap = $('modCards');
  function makeCard(label, cls, color, onTap, small) {
    var b = el('button', 'card ' + (cls || ''));
    b.type = 'button';
    if (color) b.style.setProperty('--c', color);
    b.innerHTML = '<span class="corner tl">' + label + '</span><span class="big' + (small ? ' sm' : '') + '">' + label + '</span><span class="corner br">' + label + '</span><span class="check">✓</span>';
    b.addEventListener('click', onTap);
    return b;
  }
  var numBtns = [], modBtns = {}, bustBtn;
  for (var n = 0; n <= 12; n++) (function (n) {
    var b = makeCard(n, 'num', COLORS[n], function () {
      var h = hand(S.sel); if (!h) return;
      var i = h.nums.indexOf(n);
      if (i >= 0) h.nums.splice(i, 1); else h.nums.push(n);
      h.bust = false; h.typed = ''; commit();
    }, n >= 10);
    b.setAttribute('aria-label', 'Number card ' + n);
    numBtns.push(b); numWrap.appendChild(b);
  })(n);
  var x2 = makeCard('×2', 'mod x2', null, function () { var h = hand(S.sel); h.x2 = !h.x2; h.bust = false; h.typed = ''; commit(); }, true);
  x2.setAttribute('aria-label', 'Times two modifier'); modBtns.x2 = x2; modWrap.appendChild(x2);
  FS.MODS.forEach(function (m) {
    var b = makeCard('+' + m, 'mod', null, function () {
      var h = hand(S.sel); var i = h.plus.indexOf(m);
      if (i >= 0) h.plus.splice(i, 1); else h.plus.push(m);
      h.bust = false; h.typed = ''; commit();
    }, true);
    b.setAttribute('aria-label', 'Plus ' + m + ' modifier');
    modBtns[m] = b; modWrap.appendChild(b);
  });
  bustBtn = el('button', 'card bustcard');
  bustBtn.type = 'button';
  bustBtn.setAttribute('aria-label', 'Busted');
  bustBtn.innerHTML = '<span class="star">★</span><span class="big"><span>BUSTED</span></span><span class="check">✓</span>';
  bustBtn.addEventListener('click', function () { var h = hand(S.sel); h.bust = !h.bust; h.typed = ''; commit(); });
  modWrap.appendChild(bustBtn);

  // ---- render ----
  function render() {
    var t = totals(), over = isOver(t), lead = leaders(t);
    if (S.sel == null || !S.players.some(function (p) { return p.id === S.sel; })) S.sel = S.players.length ? S.players[0].id : null;

    // players
    var pl = $('playerList'); pl.innerHTML = '';
    S.players.forEach(function (p) {
      var c = el('button', 'chip', esc(p.name) + ' <span class="x" aria-hidden="true">×</span>');
      c.type = 'button'; c.setAttribute('aria-label', 'Remove ' + p.name);
      c.addEventListener('click', function () { removePlayer(p.id); });
      pl.appendChild(c);
    });
    if (document.activeElement !== $('targetInput')) $('targetInput').value = S.target;

    // entry
    var has = S.players.length > 0;
    $('entryBody').hidden = !has; $('entryEmpty').hidden = has;
    $('roundNo').textContent = S.rounds.length + 1;
    var who = $('whoChips'); who.innerHTML = '';
    S.players.forEach(function (p) {
      var h = S.hands[p.id], r = FS.scoreHand(h);
      var touched = h && (h.nums.length || h.x2 || h.plus.length || h.bust || h.typed !== '');
      var c = el('button', 'chip' + (p.id === S.sel ? ' on' : '') + (touched ? ' done' : ''), esc(p.name) + ' <span class="pts">' + r.score + '</span>');
      c.type = 'button'; c.setAttribute('aria-pressed', p.id === S.sel);
      c.addEventListener('click', function () { S.sel = p.id; commit(); });
      who.appendChild(c);
    });
    if (has) {
      var h = hand(S.sel), r = FS.scoreHand(h);
      $('liveName').textContent = nameOf(S.sel);
      $('liveScore').textContent = r.score;
      $('liveNote').textContent = r.note;
      $('entryBody').querySelector('.live').className = 'live ' + r.kind;
      var typed = h.typed !== '';
      numBtns.forEach(function (b, i) { b.classList.toggle('on', !typed && h.nums.indexOf(i) >= 0); b.setAttribute('aria-pressed', h.nums.indexOf(i) >= 0); });
      modBtns.x2.classList.toggle('on', !typed && h.x2);
      FS.MODS.forEach(function (m) { modBtns[m].classList.toggle('on', !typed && h.plus.indexOf(m) >= 0); });
      bustBtn.classList.toggle('on', !typed && h.bust);
      numWrap.classList.toggle('dim', !typed && h.bust);
      modWrap.classList.toggle('dim', !typed && h.bust);
      if (document.activeElement !== $('typedInput')) $('typedInput').value = h.typed;
      $('saveBtn').disabled = over; $('nextBtn').disabled = S.players.length < 2;
    }

    // scores
    $('status').textContent = over ? 'Game over after ' + S.rounds.length + ' round' + (S.rounds.length === 1 ? '' : 's') + '. Played to ' + S.target + '.'
      : 'Round ' + (S.rounds.length + 1) + ' is next. Playing to ' + S.target + '.';
    var last = S.rounds[S.rounds.length - 1];
    var body = $('scoreBody'); body.innerHTML = '';
    var sorted = S.players.slice().sort(function (a, b) { return t[b.id] - t[a.id]; });
    sorted.forEach(function (p) {
      var isLead = S.rounds.length && lead.ids.indexOf(p.id) >= 0;
      var lr = last && last[p.id] ? (last[p.id].bust ? '0 (bust)' : last[p.id].score) : '—';
      var tr = el('tr', isLead ? 'lead' : '', '<td>' + esc(p.name) + '</td><td>' + lr + '</td><td>' + t[p.id] + '</td>');
      body.appendChild(tr);
    });
    if (!S.players.length) body.innerHTML = '<tr><td colspan="3">No players yet.</td></tr>';

    // history
    var ht = $('historyTable');
    if (!S.rounds.length) ht.innerHTML = '<tr><td>No rounds yet.</td></tr>';
    else {
      var hh = '<thead><tr><th>Round</th>' + S.players.map(function (p) { return '<th>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
      S.rounds.forEach(function (r, i) {
        hh += '<tr><td>' + (i + 1) + '</td>' + S.players.map(function (p) {
          var c = r[p.id]; return c ? '<td' + (c.bust ? ' class="b"' : '') + '>' + c.score + '</td>' : '<td>—</td>';
        }).join('') + '</tr>';
      });
      ht.innerHTML = hh + '</tbody>';
    }

    // winner
    var w = $('winner');
    if (over) {
      var names = lead.ids.map(nameOf);
      w.innerHTML = '🏆 ' + esc(names.join(' & ')) + (names.length > 1 ? ' tie!' : ' wins!') + '<small>' + lead.best + ' points</small>';
      w.hidden = false;
    } else w.hidden = true;
    $('undoBtn').disabled = !S.rounds.length;
  }
  function commit() { save(); render(); }

  // ---- actions ----
  function removePlayer(id) {
    S.players = S.players.filter(function (p) { return p.id !== id; });
    delete S.hands[id];
    commit();
  }
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('nameInput').value.trim();
    if (!name) return;
    var id = 'p' + (S.nextId++);
    S.players.push({ id: id, name: name });
    if (!S.sel) S.sel = id;
    $('nameInput').value = '';
    commit();
  });
  $('targetInput').addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    if (v > 0) { S.target = v; commit(); }
  });
  $('targetInput').addEventListener('blur', render);
  $('typedInput').addEventListener('input', function () {
    var h = hand(S.sel); h.typed = this.value.trim(); commit();
  });
  $('clearBtn').addEventListener('click', function () { S.hands[S.sel] = FS.emptyHand(); $('typedInput').value = ''; commit(); });
  $('nextBtn').addEventListener('click', function () {
    var i = S.players.findIndex(function (p) { return p.id === S.sel; });
    S.sel = S.players[(i + 1) % S.players.length].id; $('typedInput').blur(); commit();
  });
  $('saveBtn').addEventListener('click', function () {
    if (!S.players.length || isOver(totals())) return;
    var r = {};
    S.players.forEach(function (p) { var s = FS.scoreHand(S.hands[p.id]); r[p.id] = { score: s.score, bust: s.kind === 'bust' }; });
    S.rounds.push(r); S.hands = {}; S.sel = S.players[0].id;
    $('typedInput').value = '';
    commit();
    if (isOver(totals())) $('winner').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('undoBtn').addEventListener('click', function () { if (S.rounds.length) { S.rounds.pop(); commit(); } });
  $('newGameBtn').addEventListener('click', function () {
    if (S.rounds.length && !isOver(totals()) && !confirm('Start a new game with the same players? Scores will be cleared.')) return;
    S.rounds = []; S.hands = {}; S.sel = S.players.length ? S.players[0].id : null; commit();
  });
  var armTimer;
  $('resetBtn').addEventListener('click', function () {
    var b = this;
    if (!b.classList.contains('armed')) {
      b.classList.add('armed'); b.textContent = 'Tap again to confirm';
      clearTimeout(armTimer);
      armTimer = setTimeout(function () { b.classList.remove('armed'); b.textContent = 'Start over'; }, 3000);
      return;
    }
    clearTimeout(armTimer); b.classList.remove('armed'); b.textContent = 'Start over';
    S = fresh(); commit();
  });

  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();

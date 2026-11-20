/* Charts, the "On shift" game, and the savings calculator. No libraries. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /* ---------- Chart: alerts by hour ---------- */
  // NoiseAware alerts across all homes, summed over a 6-day sample (Sep 1 to 6), Pacific time.
  var HOURS = [
    ['12 PM', 25], ['1 PM', 29], ['2 PM', 20], ['3 PM', 21], ['4 PM', 26], ['5 PM', 16], ['6 PM', 23],
    ['7 PM', 26], ['8 PM', 25], ['9 PM', 46], ['10 PM', 33], ['11 PM', 34], ['12 AM', 34], ['1 AM', 29],
    ['2 AM', 21], ['3 AM', 22], ['4 AM', 22], ['5 AM', 25], ['6 AM', 20], ['7 AM', 19], ['8 AM', 25],
    ['9 AM', 32], ['10 AM', 27], ['11 AM', 24]
  ];
  var PEAK = { '9 PM': 1, '10 PM': 1, '11 PM': 1, '12 AM': 1 };

  function hourChart() {
    var host = document.getElementById('chart-hours');
    if (!host) return;
    var W = 1080, H = 300, m = { t: 26, r: 8, b: 34, l: 34 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': 'chart-hours-title chart-hours-desc' }, host);
    var max = 50, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var g = el('g', { class: 'grid' }, svg), ax = el('g', { class: 'axis' }, svg);
    [0, 10, 20, 30, 40, 50].forEach(function (v) {
      var y = m.t + ih - v / max * ih;
      if (v) el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y }, g);
      var t = el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end' }, ax); t.textContent = v;
    });
    el('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih }, svg);
    var band = iw / HOURS.length, bw = Math.min(18, band - 4);
    var tip = host.parentNode.querySelector('.tooltip');
    HOURS.forEach(function (d, i) {
      var h = d[1] / max * ih, x = m.l + i * band + (band - bw) / 2, y = m.t + ih - h;
      var r = Math.min(4, h / 2);
      var path = 'M' + x + ',' + (m.t + ih) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + (m.t + ih) + 'Z';
      var bar = el('path', { d: path, class: 'bar', fill: PEAK[d[0]] ? css('--ink') : css('--quiet'), tabindex: 0, 'aria-label': d[0] + ': ' + d[1] + ' alerts' }, svg);
      // larger hit target
      var hit = el('rect', { x: m.l + i * band, y: m.t, width: band, height: ih, fill: 'transparent' }, svg);
      function show() {
        tip.textContent = d[0] + ': ' + d[1] + ' alerts (about ' + Math.round(d[1] / 6) + ' a day)';
        var bb = host.getBoundingClientRect(), sb = svg.getBoundingClientRect();
        tip.style.left = (host.offsetLeft + (x + bw / 2) / W * sb.width) + 'px';
        tip.style.top = (host.offsetTop + y / H * sb.height - 6) + 'px';
        tip.classList.add('show');
      }
      function hide() { tip.classList.remove('show'); }
      [bar, hit].forEach(function (n) { n.addEventListener('mouseenter', show); n.addEventListener('mouseleave', hide); });
      bar.addEventListener('focus', show); bar.addEventListener('blur', hide);
      if (i % 2 === 0) { var t = el('text', { x: x + bw / 2, y: H - 12, 'text-anchor': 'middle' }, ax); t.textContent = d[0]; }
    });
    var peakX = m.l + 9 * band, a = el('text', { class: 'annot', x: peakX + band * 2, y: m.t - 8, 'text-anchor': 'middle' }, svg);
    a.textContent = 'Busiest: 9 PM to 1 AM';
  }

  /* ---------- Segmented bars ---------- */
  function segbar(id, parts) {
    var host = document.getElementById(id);
    if (!host) return;
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
    var bar = host.querySelector('.segbar'), legend = host.querySelector('.legend');
    parts.forEach(function (p) {
      var pct = Math.round(p.v / total * 100);
      var s = document.createElement('div');
      s.className = 'seg'; s.style.flex = p.v; s.style.background = p.c;
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', p.n + ': ' + pct + '%');
      s.title = p.n + ': ' + pct + '% (' + p.v + ')';
      if (pct >= 10) s.textContent = pct + '%';
      bar.appendChild(s);
      var li = document.createElement('li');
      li.innerHTML = '<span class="sw" style="background:' + p.c + '"></span>' + p.n + (pct < 10 ? ' (' + pct + '%)' : '');
      legend.appendChild(li);
    });
  }

  /* ---------- Game ---------- */
  var CHOICES = [
    { id: 'leeway', label: 'Let it be' },
    { id: 'remind', label: 'Send a reminder' },
    { id: 'escalate', label: 'Call for backup' },
    { id: 'sensor', label: 'Flag the sensor' }
  ];
  var ROUNDS = [
    {
      title: 'Indoor sensor, 14 minutes over the limit',
      facts: [['Time', '10:40 PM, quiet hours start at 10'], ['Care level', 'Standard'], ['Booking', '6 guests, checked in today'], ['Camera', 'Quiet outside. Voices faint through the door.']],
      level: 62, answer: 'leeway',
      why: 'A standard home, the noise stays indoors, and nothing carries outside. Our rules say give them some room.',
      bot: 'Marks it low priority and watches the level. If it drops within 10 minutes, it closes and logs itself. No one needs to step in.',
      botAlone: true
    },
    {
      title: 'Outdoor sensor, 25 minutes over the limit',
      facts: [['Time', '11:15 PM, quiet hours'], ['Care level', 'Highest'], ['Booking', '14 guests, Friday night'], ['Camera', 'Loud music and shouting by the pool']],
      level: 92, answer: 'remind',
      why: 'A home that needs the most care, with noise you can hear outside. Our rules say text and call the guest right away.',
      bot: 'Puts it at the top of the queue, drafts the text, and starts a 10 minute timer. A teammate checks the camera and sends.',
      botAlone: false
    },
    {
      title: 'Outdoor sensor, level jumping up and down',
      facts: [['Time', '2:10 PM'], ['Care level', 'Extra care'], ['Booking', 'None. Home is empty until Friday.'], ['Camera', 'No motion all day']],
      level: 74, answer: 'sensor',
      why: 'No one is staying there. An alert in an empty home is a sign of a bad sensor, wind or traffic.',
      bot: 'Sees the home is empty, lets the team skip it, and adds it to the faulty sensor list for repair.',
      botAlone: true
    },
    {
      title: 'Still loud, 12 minutes after a reminder',
      facts: [['Time', '12:20 AM'], ['Care level', 'Extra care'], ['Booking', '10 guests, a group that needs extra care'], ['Camera', 'Crowd in the yard, cars on the street']],
      level: 95, answer: 'escalate',
      why: 'Our rules give guests 10 minutes after a reminder. After that, call security or the area manager for backup.',
      bot: 'Nudges the team the moment the 10 minutes are up and shows the security contact for that market.',
      botAlone: false
    },
    {
      title: 'Indoor sensor, 20 minutes over, no camera',
      facts: [['Time', '3:45 AM'], ['Care level', 'Standard'], ['Booking', '4 guests'], ['Camera', 'This home has no outdoor camera']],
      level: 70, answer: 'remind',
      why: 'You cannot check by ear, it is the middle of quiet hours, and it has lasted 20 minutes. A gentle reminder is the safe call.',
      bot: 'Shows "no camera" up front so no one hunts for a login. Later, cases like this are good candidates for an automatic first reminder.',
      botAlone: false
    },
    {
      title: 'Outdoor sensor, 22 minutes over the limit',
      facts: [['Time', '2:30 PM, a windy afternoon'], ['Care level', 'Extra care'], ['Booking', '8 guests, out at the lake'], ['Camera', 'Wind and a leaf blower next door, no guests home']],
      level: 80, answer: 'leeway',
      why: 'The guests are not even there. This is weather and a neighbor, not a party.',
      bot: 'Cannot hear the cameras, so it still asks a person. It does flag that daytime outdoor alerts at this home are often wind.',
      botAlone: false
    }
  ];

  function game() {
    var root = document.getElementById('game');
    if (!root) return;
    var i = 0, score = 0, botCount = 0;
    var progress = root.querySelector('.progress'), scoreEl = root.querySelector('.score');
    var body = root.querySelector('.game-body'), live = root.querySelector('.game-live');

    function renderRound() {
      var r = ROUNDS[i];
      progress.textContent = 'Alert ' + (i + 1) + ' of ' + ROUNDS.length;
      scoreEl.textContent = 'Same call as the team: ' + score;
      var facts = r.facts.map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + f[1] + '</dd>'; }).join('');
      body.innerHTML =
        '<div class="alert-card"><p class="alert-title">' + r.title + '</p>' +
        '<dl>' + facts + '<dt>Noise level</dt><dd>' + r.level + ' <div class="meter" aria-hidden="true"><span style="width:' + r.level + '%"></span></div></dd></dl></div>' +
        '<p style="margin:16px 0 0;font-weight:700;color:var(--ink)">What do you do?</p>' +
        '<div class="choices" role="group" aria-label="Your decision">' +
        CHOICES.map(function (c) { return '<button type="button" data-id="' + c.id + '">' + c.label + '</button>'; }).join('') +
        '</div><div class="verdict-slot"></div>';
      Array.prototype.forEach.call(body.querySelectorAll('.choices button'), function (b) {
        b.addEventListener('click', function () { pick(b); });
      });
      var first = body.querySelector('.choices button');
      if (i > 0 && first) first.focus();
    }

    function pick(btn) {
      var r = ROUNDS[i], ok = btn.dataset.id === r.answer;
      if (ok) score++;
      if (r.botAlone) botCount++;
      Array.prototype.forEach.call(body.querySelectorAll('.choices button'), function (b) { b.disabled = true; });
      btn.classList.add('picked');
      var right = CHOICES.filter(function (c) { return c.id === r.answer; })[0].label;
      var slot = body.querySelector('.verdict-slot');
      slot.innerHTML = '<div class="verdict"><p class="label" style="margin:0 0 6px">' + (ok ? 'Same call our team would make.' : 'Our team would: ' + right + '.') + '</p>' +
        '<p style="margin:0">' + r.why + '</p>' +
        '<p class="botline" style="margin:0"><b>How the helper pitches in:</b> ' + r.bot + '</p></div>' +
        '<p style="margin:16px 0 0"><button type="button" class="btn primary next">' + (i < ROUNDS.length - 1 ? 'Next alert' : 'See results') + '</button></p>';
      scoreEl.textContent = 'Same call as the team: ' + score;
      live.textContent = (ok ? 'Correct. ' : 'Not quite. Our team would ' + right.toLowerCase() + '. ') + r.why;
      var next = slot.querySelector('.next');
      next.addEventListener('click', function () { i++; if (i < ROUNDS.length) renderRound(); else end(); });
      next.focus();
    }

    function end() {
      progress.textContent = 'Shift over';
      body.innerHTML = '<div class="verdict" style="margin-top:0"><p class="pull" style="font-size:24px">You made the same call as our team on ' + score + ' of ' + ROUNDS.length + ' alerts.</p>' +
        '<p>The helper could have sorted <b>' + botCount + ' of ' + ROUNDS.length + '</b> without anyone listening. For the rest, it did the lookups, so the team only had to listen and decide.</p>' +
        '<p style="margin:0">That is the whole idea: keep people on the calls that need judgment, and let the helper do the rest.</p></div>' +
        '<p style="margin:16px 0 0"><button type="button" class="btn again">Play again</button></p>';
      live.textContent = 'Shift over. You made the same call as our team on ' + score + ' of ' + ROUNDS.length + '.';
      body.querySelector('.again').addEventListener('click', function () { i = 0; score = 0; botCount = 0; renderRound(); });
      body.querySelector('.again').focus();
    }
    renderRound();
  }

  /* ---------- Calculator ---------- */
  function calc() {
    var root = document.getElementById('calc');
    if (!root) return;
    var inputs = root.querySelectorAll('input[type=range]');
    function v(id) { return Number(document.getElementById(id).value); }
    function fmt(n, d) { return n.toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
    function update() {
      Array.prototype.forEach.call(inputs, function (inp) {
        var out = root.querySelector('output[for="' + inp.id + '"]');
        var unit = inp.dataset.unit || '';
        out.textContent = (inp.dataset.pre || '') + inp.value + unit;
      });
      var checkHrs = v('c-alerts') * v('c-mins') * (v('c-share') / 100) / 60;
      var logHrs = v('c-incidents') * v('c-logmins') * 0.9 / 60;
      var day = checkHrs + logHrs, month = day * 30, fte = month / 160, year = month * 12 * v('c-cost');
      document.getElementById('r-day').textContent = fmt(day, 1);
      document.getElementById('r-month').textContent = fmt(month);
      document.getElementById('r-fte').textContent = fmt(fte, 1);
      document.getElementById('r-year').textContent = '$' + fmt(Math.round(year / 1000)) + 'K';
    }
    Array.prototype.forEach.call(inputs, function (inp) { inp.addEventListener('input', update); });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    hourChart();
    segbar('seg-source', [
      { n: 'NoiseAware alert', v: 74, c: css('--c1') },
      { n: 'Zendesk ticket or call', v: 15, c: css('--c2') },
      { n: 'Slack post', v: 14, c: css('--c3') },
      { n: 'Team spotted it on camera', v: 9, c: css('--c4') }
    ]);
    segbar('seg-outcome', [
      { n: 'Reminder sent to guest', v: 47, c: css('--c1') },
      { n: 'No guest contact needed', v: 27, c: css('--c3') }
    ]);
    game();
    calc();
  });
})();

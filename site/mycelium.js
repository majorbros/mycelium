// Mycelium cross-section — mushrooms above, network below.
// Soil line divides the canvas. Mushrooms grow from it. Underground hyphae branch,
// fuse, and carry bioluminescent message pulses between them.

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('myc-net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Palette (matches CSS vars)
  const LIME = [163, 230, 53];
  const AMBER = [217, 119, 6];
  const CAP = [186, 96, 56];      // burnt sienna mushroom cap
  const CAP_DARK = [120, 53, 28]; // deeper cap
  const CAP_PALE = [218, 165, 120]; // paler cap
  const STEM = [231, 220, 200];   // cream stem
  const SOIL = [36, 24, 14];
  const SOIL_DEEP = [14, 10, 6];

  let W = 0, H = 0, DPR = 1;
  let soilY = 0;
  let mushrooms = [];
  let nodes = [];
  let edges = [];
  let pulses = [];
  let spores = [];
  let lastGrow = 0;
  let lastPulse = 0;
  let lastSpore = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    soilY = Math.round(H * 0.34); // soil line at 34% from top
  }

  // --------- Model ----------

  function Mushroom(x, variant) {
    this.x = x;
    this.baseY = soilY;
    // Start partway grown so mushrooms are visible on page load; finish growing during anim
    this.age = 0.6 + Math.random() * 0.3;
    this.growSpeed = 0.004 + Math.random() * 0.004;
    this.stemHeight = 36 + Math.random() * 60;
    this.stemWidth = 4 + Math.random() * 3;
    this.capRadius = 14 + Math.random() * 16;
    this.capTilt = (Math.random() - 0.5) * 0.25;
    this.variant = variant; // 0-2 different cap colors
    this.pulse = 0;
    this.rootNode = null; // anchor node below soil
    this.swayPhase = Math.random() * Math.PI * 2;
  }

  function Node(x, y) {
    this.x = x;
    this.y = y;
    this.size = 1.5 + Math.random() * 1.2;
    this.pulse = 0;
    this.birth = performance.now();
    this.isAnchor = false;
  }

  function Edge(a, b) {
    this.a = a;
    this.b = b;
    this.grown = 0;
    this.growthRate = 0.008 + Math.random() * 0.012;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const offset = (Math.random() - 0.5) * len * 0.28;
    this.cx = mx + nx * offset;
    this.cy = my + ny * offset;
  }

  // --------- Seeding ----------

  function seed() {
    mushrooms = [];
    nodes = [];
    edges = [];
    pulses = [];
    spores = [];

    // Place mushrooms at organic intervals — cluster in two or three groups
    // avoiding the center where hero text lives.
    const spots = [];
    const clusters = [
      { x: W * 0.08, spread: W * 0.14 },
      { x: W * 0.88, spread: W * 0.14 },
    ];
    if (W > 900) {
      clusters.push({ x: W * 0.5, spread: W * 0.05 }); // middle, small, only on wide screens
    }
    for (const c of clusters) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const x = c.x + (Math.random() - 0.5) * c.spread * 2;
        if (x > 30 && x < W - 30) spots.push(x);
      }
    }
    spots.sort((a, b) => a - b);

    for (let i = 0; i < spots.length; i++) {
      const variant = i % 3;
      const m = new Mushroom(spots[i], variant);
      mushrooms.push(m);

      // Anchor node just below soil line
      const anchor = new Node(spots[i], soilY + 6 + Math.random() * 8);
      anchor.isAnchor = true;
      nodes.push(anchor);
      m.rootNode = anchor;
    }

    // Connect some anchor nodes with long primary hyphae
    for (let i = 0; i < mushrooms.length; i++) {
      for (let j = i + 1; j < mushrooms.length; j++) {
        if (Math.random() < 0.45) {
          edges.push(new Edge(mushrooms[i].rootNode, mushrooms[j].rootNode));
        }
      }
    }
  }

  // Grow a new hyphal node from an existing underground node
  function grow() {
    if (nodes.length > 90) return;
    const candidates = nodes.filter(n =>
      n.y > soilY + 5 &&
      performance.now() - n.birth > 400 &&
      !n.isAnchor || (n.isAnchor && Math.random() < 0.3)
    );
    if (!candidates.length) return;
    const parent = candidates[Math.floor(Math.random() * candidates.length)];

    // Bias growth downward and outward
    const angle = (Math.PI * 0.15) + Math.random() * Math.PI * 0.7; // 27°..153° — below horizontal
    const flipX = Math.random() < 0.5 ? -1 : 1;
    const dist = 40 + Math.random() * 110;
    const nx = parent.x + Math.cos(angle) * dist * flipX;
    const ny = parent.y + Math.abs(Math.sin(angle)) * dist * 0.7;

    // Keep below soil line, within viewport
    if (ny < soilY + 5 || ny > H - 10 || nx < -30 || nx > W + 30) return;

    const child = new Node(nx, ny);
    nodes.push(child);
    edges.push(new Edge(parent, child));

    // Occasional fusing — mycelium cross-links
    if (Math.random() < 0.18 && nodes.length > 6) {
      const other = nodes[Math.floor(Math.random() * nodes.length)];
      const d = Math.hypot(other.x - child.x, other.y - child.y);
      if (other !== child && other.y > soilY && d < 200) {
        edges.push(new Edge(child, other));
      }
    }
  }

  function firePulse() {
    const grown = edges.filter(e => e.grown >= 1);
    if (!grown.length) return;
    const edge = grown[Math.floor(Math.random() * grown.length)];
    pulses.push({
      edge,
      t: 0,
      speed: 0.013 + Math.random() * 0.01,
      hue: Math.random() < 0.9 ? LIME : AMBER,
    });
  }

  function dropSpore() {
    if (!mushrooms.length || spores.length > 16) return;
    const m = mushrooms[Math.floor(Math.random() * mushrooms.length)];
    if (m.age < 0.9) return;
    spores.push({
      x: m.x + (Math.random() - 0.5) * m.capRadius * 0.6,
      y: m.baseY - m.stemHeight * m.age + 4,
      vy: 0.2 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 0.15,
      life: 1,
      size: 0.8 + Math.random() * 0.7,
    });
  }

  // --------- Rendering ----------

  function rgba(c, a) { return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; }
  function bezier(ax, ay, cx, cy, bx, by, t) {
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
    };
  }

  function drawSoil() {
    // Gradient under the soil line for depth — loam darkening with depth
    const g = ctx.createLinearGradient(0, soilY - 4, 0, H);
    g.addColorStop(0, rgba(SOIL, 0.55));
    g.addColorStop(0.4, rgba(SOIL_DEEP, 0.35));
    g.addColorStop(1, rgba(SOIL_DEEP, 0.05));
    ctx.fillStyle = g;
    ctx.fillRect(0, soilY, W, H - soilY);

    // Soil line — organic, not ruler-straight
    ctx.beginPath();
    ctx.moveTo(0, soilY);
    for (let x = 0; x <= W; x += 6) {
      const jitter = Math.sin(x * 0.021) * 0.9 + Math.cos(x * 0.05) * 0.6;
      ctx.lineTo(x, soilY + jitter);
    }
    ctx.strokeStyle = rgba([60, 42, 26], 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fine soil grain — scattered specks just under the line
    for (let i = 0; i < 22; i++) {
      const sx = (i * 73 + 37) % W;
      const sy = soilY + 3 + ((i * 19) % 18);
      ctx.fillStyle = rgba([100, 70, 40], 0.12);
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function drawMushroom(m, now) {
    if (m.age < 1) m.age = Math.min(1, m.age + m.growSpeed);

    const h = m.stemHeight * m.age;
    const capR = m.capRadius * Math.min(1, m.age * 1.1);
    const stemTopY = m.baseY - h;
    const sway = Math.sin(now * 0.0006 + m.swayPhase) * 0.5;
    const topX = m.x + sway;

    // Cap color variants
    let capColor, capDark, capPale;
    if (m.variant === 0) { capColor = CAP; capDark = CAP_DARK; capPale = CAP_PALE; }
    else if (m.variant === 1) { capColor = [160, 82, 45]; capDark = [100, 50, 20]; capPale = [210, 155, 105]; }
    else { capColor = [205, 133, 63]; capDark = [140, 85, 35]; capPale = [230, 185, 140]; }

    // Stem with slight taper, cream colored
    ctx.save();
    ctx.beginPath();
    const stemBaseW = m.stemWidth * 1.15;
    const stemTopW = m.stemWidth * 0.9;
    ctx.moveTo(m.x - stemBaseW, m.baseY);
    ctx.quadraticCurveTo(m.x - stemBaseW * 0.9, stemTopY + h * 0.4, topX - stemTopW, stemTopY);
    ctx.lineTo(topX + stemTopW, stemTopY);
    ctx.quadraticCurveTo(m.x + stemBaseW * 0.9, stemTopY + h * 0.4, m.x + stemBaseW, m.baseY);
    ctx.closePath();
    const stemGrad = ctx.createLinearGradient(m.x - stemBaseW, 0, m.x + stemBaseW, 0);
    stemGrad.addColorStop(0, rgba([180, 170, 150], 0.9));
    stemGrad.addColorStop(0.5, rgba(STEM, 0.95));
    stemGrad.addColorStop(1, rgba([170, 160, 140], 0.85));
    ctx.fillStyle = stemGrad;
    ctx.fill();
    // Subtle stem texture — vertical fibers
    ctx.strokeStyle = rgba([140, 125, 100], 0.3);
    ctx.lineWidth = 0.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(m.x + i * (stemBaseW / 3), m.baseY - 2);
      ctx.quadraticCurveTo(m.x + i * (stemBaseW / 3) * 0.85, stemTopY + h * 0.5, topX + i * (stemTopW / 3), stemTopY);
      ctx.stroke();
    }
    ctx.restore();

    if (m.age < 0.4) return;

    // Cap — dome shape with gills underneath
    ctx.save();
    ctx.translate(topX, stemTopY);
    ctx.rotate(m.capTilt + sway * 0.02);

    // Gills underneath cap (fainter, radial)
    const gillY = 2;
    for (let i = -6; i <= 6; i++) {
      const t = i / 6;
      ctx.beginPath();
      ctx.moveTo(t * capR * 0.7, gillY);
      ctx.lineTo(t * capR * 0.92, gillY + 5);
      ctx.strokeStyle = rgba([90, 70, 50], 0.35);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Cap dome
    ctx.beginPath();
    ctx.moveTo(-capR, 2);
    ctx.quadraticCurveTo(-capR * 0.92, -capR * 1.05, 0, -capR * 0.98);
    ctx.quadraticCurveTo(capR * 0.92, -capR * 1.05, capR, 2);
    ctx.quadraticCurveTo(capR * 0.65, 5, 0, 5);
    ctx.quadraticCurveTo(-capR * 0.65, 5, -capR, 2);
    ctx.closePath();

    const capGrad = ctx.createRadialGradient(-capR * 0.3, -capR * 0.7, 2, 0, 0, capR * 1.2);
    capGrad.addColorStop(0, rgba(capPale, 0.95));
    capGrad.addColorStop(0.55, rgba(capColor, 0.95));
    capGrad.addColorStop(1, rgba(capDark, 0.95));
    ctx.fillStyle = capGrad;
    ctx.fill();

    // Subtle cap mottling — spotted dots on variant 2
    if (m.variant === 2) {
      for (let i = 0; i < 5; i++) {
        const dx = (Math.sin(i * 2.3 + m.x * 0.1) * capR * 0.6);
        const dy = -capR * 0.8 + (i % 3) * capR * 0.2;
        ctx.beginPath();
        ctx.arc(dx, dy, 1 + Math.random() * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = rgba([250, 240, 220], 0.55);
        ctx.fill();
      }
    }

    // Rim highlight — catches the bioluminescent glow from below
    ctx.beginPath();
    ctx.moveTo(-capR * 0.95, 1);
    ctx.quadraticCurveTo(0, -capR * 0.2, capR * 0.95, 1);
    ctx.strokeStyle = rgba(LIME, 0.08 + m.pulse * 0.3);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    // Pulse glow when the mushroom just received a message
    if (m.pulse > 0) {
      m.pulse = Math.max(0, m.pulse - 0.015);
      ctx.beginPath();
      ctx.arc(topX, stemTopY, capR * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = rgba(LIME, m.pulse * 0.08);
      ctx.fill();
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Soil layer behind everything underground
    drawSoil();

    // --- Underground ---
    // Edges (hyphae) — fibrous, low-alpha
    ctx.lineCap = 'round';
    for (const e of edges) {
      if (e.grown < 1) e.grown = Math.min(1, e.grown + e.growthRate);

      const steps = 16;
      const end = Math.max(1, Math.floor(steps * e.grown));
      ctx.beginPath();
      for (let i = 0; i <= end; i++) {
        const t = i / steps;
        const p = bezier(e.a.x, e.a.y, e.cx, e.cy, e.b.x, e.b.y, t);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(LIME, 0.13);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // faint inner filament — gives hyphae depth
      ctx.beginPath();
      for (let i = 0; i <= end; i++) {
        const t = i / steps;
        const p = bezier(e.a.x, e.a.y, e.cx + 0.6, e.cy + 0.4, e.b.x, e.b.y, t);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(LIME, 0.05);
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // Pulses traveling through hyphae
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.speed;
      if (p.t >= 1) {
        p.edge.b.pulse = 1;
        // If destination node is an anchor, pulse the mushroom on top
        if (p.edge.b.isAnchor) {
          const m = mushrooms.find(mu => mu.rootNode === p.edge.b);
          if (m) m.pulse = 1;
        }
        pulses.splice(i, 1);
        continue;
      }

      const trailSteps = 10;
      for (let j = 0; j < trailSteps; j++) {
        const tt = Math.max(0, p.t - j * 0.022);
        const tp = bezier(p.edge.a.x, p.edge.a.y, p.edge.cx, p.edge.cy, p.edge.b.x, p.edge.b.y, tt);
        const alpha = (1 - j / trailSteps) * 0.55;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.hue, alpha);
        ctx.fill();
      }
      const head = bezier(p.edge.a.x, p.edge.a.y, p.edge.cx, p.edge.cy, p.edge.b.x, p.edge.b.y, p.t);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.hue, 0.95);
      ctx.shadowBlur = 14;
      ctx.shadowColor = rgba(p.hue, 0.9);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Underground nodes
    for (const n of nodes) {
      if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - 0.02);
      const r = n.size + n.pulse * 2;
      if (n.pulse > 0) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(LIME, n.pulse * 0.13);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(LIME, 0.5 + n.pulse * 0.4);
      ctx.shadowBlur = n.pulse > 0 ? 8 : 3;
      ctx.shadowColor = rgba(LIME, 0.6);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // --- Above ground ---
    // Mushrooms
    for (const m of mushrooms) drawMushroom(m, now);

    // Drifting spores above
    for (let i = spores.length - 1; i >= 0; i--) {
      const s = spores[i];
      s.y += s.vy;
      s.x += s.drift;
      s.life -= 0.004;
      if (s.life <= 0 || s.y > soilY - 2) { spores.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = rgba([240, 220, 190], s.life * 0.35);
      ctx.fill();
    }
  }

  // --------- Loop ----------

  function tick(now) {
    const growInterval = nodes.length < 18 ? 200 : nodes.length < 45 ? 500 : 1200;
    if (now - lastGrow > growInterval) { grow(); lastGrow = now; }

    if (now - lastPulse > 1200 + Math.random() * 1100) { firePulse(); lastPulse = now; }

    if (now - lastSpore > 700 + Math.random() * 900) { dropSpore(); lastSpore = now; }

    draw(now);
    requestAnimationFrame(tick);
  }

  function init() {
    resize();
    seed();
    for (let i = 0; i < 12; i++) grow();
    requestAnimationFrame(tick);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); seed(); for (let i = 0; i < 12; i++) grow(); }, 200);
  });

  init();
})();

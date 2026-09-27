/* cipher.js: the background. A slowly churning hexdump with encrypted packets
   drifting through it, and a lens that follows the cursor and "decrypts" the
   plaintext hidden underneath.

   When the cursor leaves or rests for a while, the lens wanders on its own.

   Edit PHRASES to change what people find. Keep them short and lowercase. */
(() => {
  "use strict";

  const PHRASES = [
    "privacy is a right, not a feature",
    "free as in freedom",
    "read the source",
    "trust, but verify",
    "it's always dns",
    "there is no cloud, just other people's computers",
    "the s in iot stands for security",
    "defense in depth",
    "least privilege",
    "have you tried turning it off and on again?",
    "works on my machine",
    "chmod 600 ~/.ssh/id_ed25519",
    "rtfm",
    "sudo !!",
    "encrypt everything",
    "own your data",
    "hello, recruiter :)",
    "you found the plaintext",
    "0 trackers loaded",
    "untested backups are just hopes",
    "security through obscurity isn't",
    "there's no place like 127.0.0.1",
    "segmentation fault (core dumped)",
    "rotate your keys",
    "man yourname",
    "git commit -m 'fix'",
    "todo: get hired",
    "uptime is a feature",
    "linux on the desktop, for real",
    "no telemetry",
    ":wq",
    "exit 0",
    "you do not have a valid subscription",
    "self-host all the things",
    "wireguard all the things",
    "passkeys, not passwords",
    "sudo dnf upgrade --refresh",
    "offline first",
  ];

  /** How fast the field scrolls compared with the page: 0 keeps it still,
      1 moves it with the text. Below 1 it reads as sitting behind the page. */
  const SCROLL_SPEED = 0;

  const canvas = document.getElementById("cipher");
  if (!canvas || !canvas.getContext) return;
  if (getComputedStyle(canvas).display === "none") return; // e.g. prefers-contrast: more

  const root = document.documentElement;
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas"); // a tile of hexdump, painted once
  const bctx = base.getContext("2d");
  if (!ctx || !bctx) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const HEX = "0123456789abcdef";
  const EDGE = "<>/\\|=+*#%&$!?;:~^";
  const FAMILY = '"Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const LEVELS = 6;      // brightness steps in the hexdump
  const GAP = 255;       // marks a space in the hexdump layout
  const IDLE_MS = 4000;  // pointer rest before the lens starts wandering

  let W = 0, H = 0, dpr = 1, fontPx = 12, lh = 17, cw = 7, cols = 0, rows = 0, tileRows = 0;
  let glyph, level, colWeight, lensWeight;
  let off = 0;           // how far the field has scrolled, in CSS pixels
  const rowCache = new Map();
  let colors = { field: "215, 210, 197", alpha: 0.1, lens: "242, 176, 74", lensMax: 0.95, packet: "143, 209, 161" };
  let levelStyles = [];
  let packets = [];
  let home = { x: 0, y: 0, ax: 0, ay: 0 };
  const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 150, placed: false };
  let lastPointer = -Infinity;
  let pointerInside = false;
  let pinnedUntil = 0;
  let raf = 0, lastFrame = 0, lastChurn = 0;
  const born = performance.now();

  const mod = (n, m) => ((n % m) + m) % m;

  // Motion-sensitive visitors get a background that stays put while they scroll.
  const fieldOffset = () => (reduce.matches ? 0 : Math.max(0, window.scrollY) * SCROLL_SPEED);

  function mulberry32(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Stable per-cell noise, so the texture doesn't reshuffle on every repaint.
  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function readColors() {
    const cs = getComputedStyle(root);
    const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    colors = {
      field: v("--field-rgb", colors.field),
      alpha: parseFloat(v("--field-alpha", colors.alpha)) || 0.1,
      lens: v("--lens-rgb", colors.lens),
      lensMax: parseFloat(v("--lens-max", colors.lensMax)) || 0.9,
      packet: v("--packet-rgb", colors.packet),
    };
    levelStyles = Array.from({ length: LEVELS }, (_, i) =>
      `rgba(${colors.field}, ${(colors.alpha * ((i + 0.5) / LEVELS) * 1.45).toFixed(4)})`);
  }

  // The text column stays calm: the field (and the lens) dim behind it.
  function computeWeights() {
    colWeight = new Float32Array(cols);
    lensWeight = new Float32Array(cols);
    const main = document.querySelector("main");
    const r = main ? main.getBoundingClientRect() : null;
    const narrow = W < 760;
    const fieldInside = narrow ? 0.5 : 0.3;
    const lensInside = narrow ? 0.32 : 0.3;
    const pad = 28, fade = 150;
    for (let x = 0; x < cols; x++) {
      const px = (x + 0.5) * cw;
      let s = 1;
      if (r) {
        const left = r.left - pad, right = r.right + pad;
        const d = px < left ? left - px : px > right ? px - right : 0;
        const k = Math.min(1, d / fade);
        s = k * k * (3 - 2 * k);
      }
      colWeight[x] = fieldInside + (1 - fieldInside) * s;
      lensWeight[x] = lensInside + (1 - lensInside) * s;
    }
    const fieldLeft = r && r.right + 80 < W - 200 ? r.right + 60 : 0;
    home = fieldLeft
      ? { x: (fieldLeft + W) / 2, y: H * 0.42, ax: (W - fieldLeft) * 0.34, ay: H * 0.27 }
      : { x: W * 0.5, y: H * 0.45, ax: W * 0.36, ay: H * 0.3 };
  }

  // The plaintext under the field. Phrases sit on every other row with random
  // gaps; each row is laid out from its own seed, so they never repeat however
  // far the page scrolls.
  function plainRow(R) {
    if ((R & 1) === 0) return null;
    let row = rowCache.get(R);
    if (row) return row;
    row = new Uint16Array(cols);
    const rand = mulberry32((0xc0ffee ^ Math.imul(R, 0x9e3779b1) ^ Math.imul(cols, 7919)) | 0);
    let x = (rand() * 22) | 0;
    for (;;) {
      const s = PHRASES[(rand() * PHRASES.length) | 0];
      if (x + s.length >= cols) break;
      for (let k = 0; k < s.length; k++) row[x + k] = s.charCodeAt(k);
      x += s.length + 8 + ((rand() * 34) | 0);
    }
    if (rowCache.size > 800) rowCache.clear();
    rowCache.set(R, row);
    return row;
  }

  // The hexdump is painted once into a tile half again as tall as the screen,
  // and the tile wraps around as the field scrolls.
  function paintBase() {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, base.width, base.height);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let l = 0; l < LEVELS; l++) {
      bctx.fillStyle = levelStyles[l];
      for (let t = 0; t < tileRows; t++) {
        const cy = t * lh + lh / 2;
        const row = t * cols;
        for (let x = 0; x < cols; x++) {
          const i = row + x;
          if (glyph[i] !== GAP && level[i] === l) bctx.fillText(HEX[glyph[i]], x * cw, cy);
        }
      }
    }
  }

  function newPacket(p = {}) {
    const top = Math.floor(off / lh);
    p.dir = Math.random() < 0.5 ? 1 : -1;
    p.vrow = top + ((Math.random() * rows) | 0); // a row of the field, not of the screen
    p.len = 5 + ((Math.random() * 9) | 0);
    p.speed = 8 + Math.random() * 16; // cells per second
    p.x = p.dir > 0 ? -p.len : cols + p.len;
    p.wait = Math.random() * 5;       // seconds before it sets off
    return p;
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    fontPx = W < 640 ? 11 : 12;
    lh = Math.round(fontPx * 1.42);
    off = fieldOffset();

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    for (const c of [ctx, bctx]) {
      c.font = `400 ${fontPx}px ${FAMILY}`;
    }
    cw = bctx.measureText("0").width || fontPx * 0.6;
    cols = Math.ceil(W / cw) + 1;
    rows = Math.ceil(H / lh) + 1;
    tileRows = Math.ceil(rows * 1.5) + 1;

    base.width = Math.round(W * dpr);
    base.height = Math.round(tileRows * lh * dpr);
    for (const c of [ctx, bctx]) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.font = `400 ${fontPx}px ${FAMILY}`;
      c.textBaseline = "middle";
    }

    glyph = new Uint8Array(cols * tileRows);
    level = new Uint8Array(cols * tileRows);
    rowCache.clear();
    computeWeights();
    readColors();

    // hexdump -C rhythm: "4f 2a 9c e1 7b 00 12 aa  c3 ..."
    const rand = mulberry32(0x5eed ^ (cols * 131 + tileRows * 7));
    for (let t = 0; t < tileRows; t++) {
      for (let x = 0; x < cols; x++) {
        const i = t * cols + x;
        const p = x % 25;
        glyph[i] = p === 24 || p % 3 === 2 ? GAP : (rand() * 16) | 0;
        const v = colWeight[x] * (0.55 + 0.9 * hash2(x, t));
        level[i] = Math.min(LEVELS - 1, Math.floor((v / 1.45) * LEVELS));
      }
    }
    paintBase();

    lens.r = W < 640 ? 112 : 168;
    if (!lens.placed) {
      lens.x = lens.tx = home.x;
      lens.y = lens.ty = home.y;
      lens.placed = true;
    }

    const n = W < 640 ? 3 : Math.min(9, Math.round(W / 210));
    packets = Array.from({ length: n }, () => {
      const p = newPacket();
      p.x = Math.random() * cols;
      p.wait = 0;
      return p;
    });
  }

  // A few hex digits change every tick, so the field never quite sits still.
  function churn(count) {
    for (let k = 0; k < count; k++) {
      const x = (Math.random() * cols) | 0;
      const t = (Math.random() * tileRows) | 0;
      const i = t * cols + x;
      if (glyph[i] === GAP) continue;
      glyph[i] = (Math.random() * 16) | 0;
      bctx.clearRect(x * cw, t * lh, cw, lh);
      bctx.fillStyle = levelStyles[level[i]];
      bctx.fillText(HEX[glyph[i]], x * cw, t * lh + lh / 2);
    }
  }

  // Lay the tile down at the current scroll position, wrapping as needed.
  function drawField() {
    const start = mod(off, tileRows * lh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = -Math.round(start * dpr); y < canvas.height; y += base.height) {
      ctx.drawImage(base, 0, y);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawPackets(dt) {
    ctx.fillStyle = `rgb(${colors.packet})`;
    for (const p of packets) {
      if (p.wait > 0) { p.wait -= dt; continue; }
      p.x += p.dir * p.speed * dt;
      const head = Math.floor(p.x);
      const cy = p.vrow * lh + lh / 2 - off;
      const done = (p.dir > 0 && head - p.len > cols) || (p.dir < 0 && head + p.len < 0);
      if (done || cy < -lh || cy > H + lh) {
        newPacket(p);
        continue;
      }
      const t = mod(p.vrow, tileRows);
      for (let k = 0; k < p.len; k++) {
        const x = head - k * p.dir;
        if (x < 0 || x >= cols) continue;
        const i = t * cols + x;
        if (glyph[i] === GAP) continue;
        ctx.globalAlpha = 0.6 * (1 - k / p.len) * colWeight[x];
        ctx.fillText(HEX[glyph[i]], x * cw, cy);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawLens(now) {
    const { x: lx, y: ly, r } = lens;

    // Clear the ciphertext under the lens, with a soft edge.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 1.08);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.7, "rgba(0,0,0,0.94)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, r * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Then draw what was underneath, resolving toward the center. Rows are
    // rows of the field, so the text moves with it as the page scrolls.
    const tick = Math.floor(now / 90);
    const x0 = Math.max(0, Math.floor((lx - r * 1.15) / cw));
    const x1 = Math.min(cols - 1, Math.ceil((lx + r * 1.15) / cw));
    const r0 = Math.floor((ly - r * 1.15 + off) / lh);
    const r1 = Math.ceil((ly + r * 1.15 + off) / lh);
    ctx.fillStyle = `rgb(${colors.lens})`;

    for (let R = r0; R <= r1; R++) {
      const cy = R * lh + lh / 2 - off;
      const dy = cy - ly;
      const plain = plainRow(R);
      for (let x = x0; x <= x1; x++) {
        const dx = x * cw + cw / 2 - lx;
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d > 1.12) continue;
        const code = plain ? plain[x] : 0;
        const noise = hash2(x * 31 + tick, R * 17 - tick);

        if (d < 0.88) {
          if (code <= 32) continue;
          const strength = Math.min(1, 0.35 + 0.9 * Math.sqrt(1 - d / 0.88));
          // Near the rim, letters flicker between ciphertext and plaintext.
          const settled = d < 0.72 || noise < (0.88 - d) / 0.16;
          ctx.globalAlpha = colors.lensMax * lensWeight[x] * (settled ? strength : strength * 0.5);
          ctx.fillText(settled ? String.fromCharCode(code) : HEX[(noise * 16) | 0], x * cw, cy);
        } else if (noise < 0.2) {
          ctx.globalAlpha = 0.24 * lensWeight[x] * Math.max(0, 1 - Math.abs(d - 1) / 0.12);
          ctx.fillText(EDGE[(noise * 97 * EDGE.length | 0) % EDGE.length], x * cw, cy);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function render(now, dt = 0) {
    drawField();
    if (!reduce.matches) drawPackets(dt);
    drawLens(now);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    // While the page scrolls, draw every frame so the field keeps pace with the
    // text; otherwise about 33 fps is plenty.
    const target = fieldOffset();
    const scrolling = target !== off;
    if (!scrolling && now - lastFrame < 30) return;
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    off = target;

    const idle = now - lastPointer > IDLE_MS && now > pinnedUntil;
    if (idle) {
      const t = (now - born) / 1000;
      lens.tx = home.x + home.ax * Math.sin(t * 0.13);
      lens.ty = home.y + home.ay * Math.sin(t * 0.087 + 1.1);
    }
    const ease = idle ? 0.03 : 0.2;
    lens.x += (lens.tx - lens.x) * ease;
    lens.y += (lens.ty - lens.y) * ease;

    if (now - lastChurn > 90) {
      churn(Math.max(8, ((cols * tileRows) / 700) | 0));
      lastChurn = now;
    }
    render(now, dt);
  }

  function start() {
    if (raf || reduce.matches || document.hidden) return;
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // With reduced motion there is no loop: repaint only when the pointer moves.
  let pending = false;
  function renderSoon() {
    if (pending) return;
    pending = true;
    requestAnimationFrame((now) => {
      pending = false;
      off = fieldOffset();
      render(now);
    });
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    pointerInside = true;
    lens.tx = e.clientX;
    lens.ty = e.clientY;
    lastPointer = performance.now();
    if (reduce.matches) {
      lens.x = lens.tx;
      lens.y = lens.ty;
      renderSoon();
    }
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    lens.tx = e.clientX;
    lens.ty = e.clientY;
    pinnedUntil = performance.now() + 2600;
    lastPointer = performance.now();
    if (reduce.matches) {
      lens.x = lens.tx;
      lens.y = lens.ty;
      renderSoon();
    }
  }, { passive: true });

  // Scrolling with a resting mouse keeps the lens under the cursor instead of
  // letting it drift off, so the field slides through it.
  window.addEventListener("scroll", () => {
    if (pointerInside) lastPointer = performance.now();
  }, { passive: true });

  document.addEventListener("mouseout", (e) => {
    if (e.relatedTarget) return;
    pointerInside = false; // pointer left the window
    lastPointer = -Infinity;
  });

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  reduce.addEventListener("change", () => {
    if (reduce.matches) { stop(); renderSoon(); } else start();
  });

  window.addEventListener("themechange", () => {
    if (!cols) return;
    readColors();
    paintBase();
    renderSoon();
  });

  // Anything that moves the text column can ask for a rebuild with this event.
  window.addEventListener("layoutchange", () => {
    if (!cols) return;
    lens.placed = false;
    build();
    renderSoon();
  });

  let lastW = window.innerWidth, lastH = window.innerHeight, resizeTimer = 0;
  window.addEventListener("resize", () => {
    const dw = Math.abs(window.innerWidth - lastW);
    const dh = Math.abs(window.innerHeight - lastH);
    if (dw < 2 && dh < 120) return; // ignore mobile toolbars sliding in and out
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lens.placed = false;
      build();
      renderSoon();
    }, 160);
  });

  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([
        document.fonts.load(`400 12px ${FAMILY}`).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ])
    : Promise.resolve();

  fontReady.then(() => {
    build();
    render(performance.now());
    canvas.classList.add("on");
    start();
  });
})();

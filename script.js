const canvas = document.getElementById("nnCanvas");
const ctx = canvas ? (canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d")) : null;

if (!canvas || !ctx) {
  document.body.classList.remove("intro-active");
  document.body.style.background =
    "radial-gradient(circle at 15% 15%, #161939 0%, #0a0c1e 45%, #05060f 100%)";
  window.__nnBooted = true;
  console.error("Neural canvas failed to initialize.");
} else {
  const complexityInput = document.getElementById("complexity");
  const tempoInput = document.getElementById("tempo");
  const learningRateInput = document.getElementById("learningRate");
  const activationFnInput = document.getElementById("activationFn");
  const trainingModeBtn = document.getElementById("trainingMode");
  const fieldModeBtn = document.getElementById("fieldMode");
  const burstBtn = document.getElementById("burst");
  const emailBtn = document.getElementById("copyEmail");
  const toast = document.getElementById("toast");

  const easeOutExpo = (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const settings = {
    complexity: Number(complexityInput ? complexityInput.value : 1.2),
    tempo: Number(tempoInput ? tempoInput.value : 1.2),
    learningRate: Number(learningRateInput ? learningRateInput.value : 0.03),
    activationFn: activationFnInput ? activationFnInput.value : "sigmoid",
    trainingMode: false,
  };

  const pointer = {
    x: 0,
    y: 0,
    active: false,
    repel: false,
    hoveredNode: -1,
    lastHoverCheck: 0,
    dirty: false,
  };

  const networkSpec = [12, 18, 16, 10, 6];
  const world = {
    w: 0,
    h: 0,
    dpr: 1,
    time: 0,
    introStart: performance.now(),
    introDone: false,
    backgroundStars: [],
    backgroundGradient: null,
    introBurstPrimed: false,
    introBurstCache: [],
  };

  const nodes = [];
  const edges = [];
  const layers = [];
  const adjacency = [];

  class SpatialHash {
    constructor(cellSize = 70) {
      this.cellSize = cellSize;
      this.map = new Map();
      this.activeKeys = [];
    }

    clear() {
      for (let i = 0; i < this.activeKeys.length; i += 1) {
        this.map.get(this.activeKeys[i]).length = 0;
      }
      this.activeKeys.length = 0;
    }

    insert(index, x, y) {
      const cx = (x / this.cellSize) | 0;
      const cy = (y / this.cellSize) | 0;
      const key = cx * 65536 + cy;
      let bucket = this.map.get(key);
      if (!bucket) {
        bucket = [];
        this.map.set(key, bucket);
      }
      if (!bucket.length) this.activeKeys.push(key);
      bucket.push(index);
    }

    nearest(x, y, maxDist = 85) {
      const cx = (x / this.cellSize) | 0;
      const cy = (y / this.cellSize) | 0;
      let best = -1;
      let bestD2 = maxDist * maxDist;

      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const key = (cx + ox) * 65536 + (cy + oy);
          const bucket = this.map.get(key);
          if (!bucket) continue;

          for (let i = 0; i < bucket.length; i += 1) {
            const n = nodes[bucket[i]];
            const dx = n.px - x;
            const dy = n.py - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
              bestD2 = d2;
              best = bucket[i];
            }
          }
        }
      }

      return best;
    }
  }

  const spatial = new SpatialHash(72);

  const particlePool = {
    max: 1400,
    x: new Float32Array(1400),
    y: new Float32Array(1400),
    vx: new Float32Array(1400),
    vy: new Float32Array(1400),
    size: new Float32Array(1400),
    life: new Float32Array(1400),
    hue: new Float32Array(1400),
    active: new Uint8Array(1400),
    free: new Uint16Array(1400),
    freeTop: 1400,
  };

  for (let i = 0; i < particlePool.max; i += 1) {
    particlePool.free[i] = i;
  }

  function spawnPoolParticle(x, y, vx, vy, life, size, hue = 180) {
    if (!particlePool.freeTop) return;
    const i = particlePool.free[--particlePool.freeTop];
    particlePool.active[i] = 1;
    particlePool.x[i] = x;
    particlePool.y[i] = y;
    particlePool.vx[i] = vx;
    particlePool.vy[i] = vy;
    particlePool.life[i] = life;
    particlePool.size[i] = size;
    particlePool.hue[i] = hue;
  }

  function activation(x) {
    if (settings.activationFn === "relu") return Math.max(0, x);
    if (settings.activationFn === "tanh") return Math.tanh(x);
    return 1 / (1 + Math.exp(-x));
  }

  function setupNetwork() {
    nodes.length = 0;
    edges.length = 0;
    layers.length = 0;
    adjacency.length = 0;

    const leftPad = Math.max(70, world.w * 0.09);
    const rightPad = Math.max(90, world.w * 0.1);
    const topPad = Math.max(100, world.h * 0.18);
    const bottomPad = Math.max(100, world.h * 0.2);
    const usableW = Math.max(240, world.w - leftPad - rightPad);
    const usableH = Math.max(220, world.h - topPad - bottomPad);

    let cursor = 0;
    for (let li = 0; li < networkSpec.length; li += 1) {
      const count = networkSpec[li];
      const start = cursor;
      const x = leftPad + (li / (networkSpec.length - 1)) * usableW;

      for (let i = 0; i < count; i += 1) {
        const y = topPad + ((i + 0.5) / count) * usableH;
        nodes.push({
          layer: li,
          indexInLayer: i,
          baseX: x,
          baseY: y,
          px: x,
          py: y,
          z: (Math.random() - 0.5) * 0.8,
          driftPhase: Math.random() * Math.PI * 2,
          value: Math.random() * 0.2,
          bias: (Math.random() * 2 - 1) * 0.35,
          pulse: 0,
        });
        adjacency.push([]);
        cursor += 1;
      }

      layers.push({ start, count });
    }

    for (let li = 0; li < networkSpec.length - 1; li += 1) {
      const fromLayer = layers[li];
      const toLayer = layers[li + 1];

      for (let i = 0; i < fromLayer.count; i += 1) {
        const from = fromLayer.start + i;
        for (let j = 0; j < toLayer.count; j += 1) {
          const to = toLayer.start + j;
          const weight = (Math.random() * 2 - 1) * 0.95;
          const edge = {
            from,
            to,
            weight,
            signal: 0,
            phase: Math.random() * Math.PI * 2,
          };
          adjacency[from].push(edges.length);
          adjacency[to].push(edges.length);
          edges.push(edge);
        }
      }
    }

    world.backgroundStars = Array.from({ length: 44 }, (_, i) => ({
      x: Math.random() * world.w,
      y: Math.random() * world.h,
      speed: 0.015 + (i % 7) * 0.004,
      size: 0.8 + (i % 3) * 0.6,
    }));

    world.backgroundGradient = ctx.createLinearGradient(0, 0, world.w, world.h);
    world.backgroundGradient.addColorStop(0, "#090c20");
    world.backgroundGradient.addColorStop(0.65, "#070916");
    world.backgroundGradient.addColorStop(1, "#04050d");

    world.introBurstCache = Array.from({ length: 260 }, (_, i) => {
      const ang = (i / 260) * Math.PI * 2;
      const jitter = 1 + (i % 11) * 0.02;
      return {
        cos: Math.cos(ang),
        sin: Math.sin(ang),
        radiusJitter: jitter,
        hue: 200 + (i % 58),
        speed: 0.11 + (i % 7) * 0.008,
      };
    });
    world.introBurstPrimed = false;
  }

  function resize() {
    world.w = window.innerWidth;
    world.h = window.innerHeight;
    world.dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    canvas.width = Math.floor(world.w * world.dpr);
    canvas.height = Math.floor(world.h * world.dpr);
    canvas.style.width = `${world.w}px`;
    canvas.style.height = `${world.h}px`;
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);

    setupNetwork();
  }

  let lastForwardAt = 0;
  const edgeNoise = new Float32Array(760);
  function forwardPropagate(now) {
    if (now - lastForwardAt < 70) return;
    lastForwardAt = now;

    const input = layers[0];
    for (let i = 0; i < input.count; i += 1) {
      const idx = input.start + i;
      const n = nodes[idx];
      const rhythm = Math.sin(now * 0.0016 * settings.tempo + i * 0.47) * 0.5 + 0.5;
      n.value = rhythm;
    }

    for (let li = 1; li < layers.length; li += 1) {
      const prev = layers[li - 1];
      const cur = layers[li];

      for (let j = 0; j < cur.count; j += 1) {
        const toIdx = cur.start + j;
        let sum = 0;

        for (let i = 0; i < prev.count; i += 1) {
          const fromIdx = prev.start + i;
          const edgeIdx = edgeIndexFor(li - 1, i, j);
          const edge = edges[edgeIdx];
          const contribution = nodes[fromIdx].value * edge.weight;
          sum += contribution;

          const signalBoost = Math.abs(contribution) * 1.4;
          edge.signal = Math.min(1, edge.signal + signalBoost);
          if (signalBoost > 0.24 && Math.random() < 0.45) {
            const from = nodes[fromIdx];
            const to = nodes[toIdx];
            spawnPoolParticle(
              from.px,
              from.py,
              (to.px - from.px) * (0.01 + Math.random() * 0.01),
              (to.py - from.py) * (0.01 + Math.random() * 0.01),
              0.7 + Math.random() * 0.35,
              1.4 + Math.random() * 1.8,
              edge.weight > 0 ? 176 : 262,
            );
          }
        }

        const n = nodes[toIdx];
        n.value = activation(sum + n.bias);
        n.pulse = Math.min(1.3, n.pulse + Math.abs(n.value) * 0.9);
      }
    }

    if (settings.trainingMode) {
      const out = layers[layers.length - 1];
      for (let oi = 0; oi < out.count; oi += 1) {
        const outIdx = out.start + oi;
        const target = 0.5 + 0.5 * Math.sin(now * 0.0012 + oi * 0.8);
        const error = target - nodes[outIdx].value;
        nodes[outIdx].bias += error * settings.learningRate * 0.02;
      }

      for (let i = 0; i < edges.length; i += 1) {
        const edge = edges[i];
        const delta = edgeNoise[i] * settings.learningRate * 0.04;
        edge.weight = clamp(edge.weight + delta, -1.5, 1.5);
      }
    }
  }

  const edgeLayerStarts = [];
  function buildEdgeIndex() {
    edgeLayerStarts.length = 0;
    let cursor = 0;
    for (let li = 0; li < layers.length - 1; li += 1) {
      edgeLayerStarts.push(cursor);
      cursor += layers[li].count * layers[li + 1].count;
    }
  }

  function edgeIndexFor(layerIdx, i, j) {
    const start = edgeLayerStarts[layerIdx];
    return start + i * layers[layerIdx + 1].count + j;
  }

  function updateNodes(dt, now) {
    spatial.clear();

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const parallax = n.z * 8;
      const driftA = Math.sin(now * 0.0012 + n.driftPhase) * 5 * settings.complexity;
      const driftB = Math.cos(now * 0.0011 + n.driftPhase * 1.7) * 5 * settings.complexity;

      const targetX = n.baseX + parallax + driftA;
      const targetY = n.baseY + driftB;

      n.px += (targetX - n.px) * Math.min(1, dt * 8.5);
      n.py += (targetY - n.py) * Math.min(1, dt * 8.5);

      if (pointer.active) {
        const dx = pointer.x - n.px;
        const dy = pointer.y - n.py;
        const d = Math.hypot(dx, dy) + 0.0001;
        const influence = (pointer.repel ? -1 : 1) * Math.min(20, 150 / d) * settings.complexity;
        n.px += (dx / d) * influence;
        n.py += (dy / d) * influence;
      }

      n.pulse *= 0.94;
      spatial.insert(i, n.px, n.py);
    }

    if (pointer.active && (now - pointer.lastHoverCheck > 40 || pointer.dirty)) {
      pointer.hoveredNode = spatial.nearest(pointer.x, pointer.y, 75);
      pointer.lastHoverCheck = now;
      pointer.dirty = false;
    } else if (!pointer.active) {
      pointer.hoveredNode = -1;
    }
  }

  function drawBackground(now) {
    ctx.fillStyle = world.backgroundGradient;
    ctx.fillRect(0, 0, world.w, world.h);

    for (let i = 0; i < world.backgroundStars.length; i += 1) {
      const s = world.backgroundStars[i];
      const x = (s.x + now * s.speed) % (world.w + 12) - 6;
      const y = s.y + Math.sin(now * 0.00035 + i) * 6;
      ctx.fillStyle = `rgba(120,160,255,${0.06 + (i % 5) * 0.012})`;
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEdges(now) {
    ctx.lineCap = "round";

    const drawGroup = (positive) => {
      ctx.beginPath();
      for (let i = 0; i < edges.length; i += 1) {
        const e = edges[i];
        if ((e.weight >= 0) !== positive) continue;
        const a = nodes[e.from];
        const b = nodes[e.to];
        const edgeGlow = Math.abs(e.weight) * 0.2 + e.signal * 0.7;
        if (edgeGlow < 0.05) continue;
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
      }

      ctx.strokeStyle = positive
        ? `rgba(100,255,218,${0.12 + settings.complexity * 0.08})`
        : `rgba(141,112,255,${0.12 + settings.complexity * 0.08})`;
      ctx.lineWidth = positive ? 1.15 : 1;
      ctx.shadowColor = positive ? "rgba(100,255,218,0.35)" : "rgba(123,97,255,0.3)";
      ctx.shadowBlur = 7;
      ctx.stroke();
    };

    drawGroup(true);
    drawGroup(false);
    ctx.shadowBlur = 0;

    if (pointer.hoveredNode >= 0) {
      ctx.beginPath();
      const refs = adjacency[pointer.hoveredNode];
      for (let i = 0; i < refs.length; i += 1) {
        const e = edges[refs[i]];
        const a = nodes[e.from];
        const b = nodes[e.to];
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(255,255,255,0.25)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i];
      e.signal *= 0.92;
      e.signal += (Math.sin(now * 0.001 + e.phase) * 0.5 + 0.5) * 0.01;
    }
  }

  function drawNodes() {
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const valNorm = settings.activationFn === "tanh" ? (n.value + 1) * 0.5 : clamp(n.value, 0, 1);
      const brightness = 52 + valNorm * 35;
      const radius = 2.4 + valNorm * 3.4 + n.pulse * 1.6;
      const hue = 190 + n.layer * 10 + valNorm * 18;

      ctx.shadowColor = `hsla(${hue}, 100%, 76%, 0.7)`;
      ctx.shadowBlur = 8 + valNorm * 10 + n.pulse * 8;
      ctx.fillStyle = `hsla(${hue}, 92%, ${brightness}%, ${0.64 + valNorm * 0.25})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, radius, 0, Math.PI * 2);
      ctx.fill();

      if (pointer.hoveredNode === i) {
        ctx.strokeStyle = "rgba(255,255,255,0.88)";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(n.px, n.py, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
  }

  function updateAndDrawPool(dt) {
    for (let i = 0; i < particlePool.max; i += 1) {
      if (!particlePool.active[i]) continue;

      particlePool.life[i] -= dt * 1.35;
      if (particlePool.life[i] <= 0) {
        particlePool.active[i] = 0;
        particlePool.free[particlePool.freeTop++] = i;
        continue;
      }

      particlePool.x[i] += particlePool.vx[i] * dt * 60;
      particlePool.y[i] += particlePool.vy[i] * dt * 60;

      const alpha = clamp(particlePool.life[i], 0, 1);
      ctx.fillStyle = `hsla(${particlePool.hue[i]}, 100%, 72%, ${alpha * 0.9})`;
      ctx.shadowColor = `hsla(${particlePool.hue[i]}, 100%, 70%, ${alpha})`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particlePool.x[i], particlePool.y[i], particlePool.size[i], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawIntro(now) {
    const elapsed = (now - world.introStart) / 1000;

    if (elapsed <= 2) {
      const p = elapsed / 2;
      const glow = 25 + p * 60;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, world.w, world.h);
      ctx.shadowColor = "rgba(140,170,255,0.9)";
      ctx.shadowBlur = glow;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(world.w * 0.5, world.h * 0.5, 2.5 + p * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }

    if (elapsed <= 4) {
      const p = easeOutExpo((elapsed - 2) / 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, world.w, world.h);

      const cx = world.w * 0.5;
      const cy = world.h * 0.5;
      if (!world.introBurstPrimed) {
        for (let i = 0; i < world.introBurstCache.length; i += 1) {
          const c = world.introBurstCache[i];
          spawnPoolParticle(
            cx + c.cos * 2,
            cy + c.sin * 2,
            c.cos * c.speed,
            c.sin * c.speed,
            2.2,
            1.7,
            c.hue,
          );
        }
        world.introBurstPrimed = true;
      }

      for (let i = 0; i < world.introBurstCache.length; i += 2) {
        const c = world.introBurstCache[i];
        spawnPoolParticle(
          cx + c.cos * p * (world.w * 0.06 * c.radiusJitter),
          cy + c.sin * p * (world.w * 0.06 * c.radiusJitter),
          c.cos * c.speed * 0.5,
          c.sin * c.speed * 0.5,
          0.18,
          1.5,
          c.hue,
        );
      }
      updateAndDrawPool(1 / 60);
      return;
    }

    if (elapsed <= 6) {
      const p = (elapsed - 4) / 2;
      drawBackground(now);

      ctx.globalAlpha = clamp(0.2 + p * 0.9, 0, 1);
      drawEdges(now);
      drawNodes();
      ctx.globalAlpha = 1;

      if (elapsed > 5.8 && !world.introDone) {
        world.introDone = true;
        document.body.classList.remove("intro-active");
      }
      return;
    }

    world.introDone = true;
  }

  function spawnSignalBurst(mult = 1) {
    const total = Math.floor(120 * mult);
    for (let i = 0; i < total; i += 1) {
      const edge = edges[(Math.random() * edges.length) | 0];
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      spawnPoolParticle(
        a.px,
        a.py,
        (b.px - a.px) * (0.009 + Math.random() * 0.02),
        (b.py - a.py) * (0.009 + Math.random() * 0.02),
        0.6 + Math.random() * 0.7,
        1.3 + Math.random() * 1.9,
        edge.weight > 0 ? 175 : 268,
      );
      edge.signal = Math.min(1, edge.signal + 0.8);
    }
  }

  let previousNow = performance.now();
  let paused = false;
  function tick(now) {
    if (paused) {
      previousNow = now;
      requestAnimationFrame(tick);
      return;
    }

    const dt = clamp((now - previousNow) / 1000, 0.001, 0.033);
    previousNow = now;
    world.time = now;

    updateNodes(dt, now);
    forwardPropagate(now);

    if (!world.introDone) {
      drawIntro(now);
    } else {
      drawBackground(now);
      drawEdges(now);
      updateAndDrawPool(dt);
      drawNodes();

      if (Math.random() < 0.04 * settings.complexity) {
        const edge = edges[(Math.random() * edges.length) | 0];
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        spawnPoolParticle(a.px, a.py, (b.px - a.px) * 0.012, (b.py - a.py) * 0.012, 0.55, 1.4, 198);
      }
    }

    requestAnimationFrame(tick);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.textContent = "";
    }, 1800);
  }

  canvas.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.dirty = true;
  }, { passive: true });

  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
    pointer.hoveredNode = -1;
  });

  canvas.addEventListener("pointerdown", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.dirty = true;
    spawnSignalBurst(1.5);
  });

  if (complexityInput) {
    complexityInput.addEventListener("input", () => {
      settings.complexity = Number(complexityInput.value);
    });
  }

  if (tempoInput) {
    tempoInput.addEventListener("input", () => {
      settings.tempo = Number(tempoInput.value);
    });
  }

  if (learningRateInput) {
    learningRateInput.addEventListener("input", () => {
      settings.learningRate = Number(learningRateInput.value);
    });
  }

  if (activationFnInput) {
    activationFnInput.addEventListener("change", () => {
      settings.activationFn = activationFnInput.value;
    });
  }

  if (trainingModeBtn) {
    trainingModeBtn.addEventListener("click", () => {
      settings.trainingMode = !settings.trainingMode;
      trainingModeBtn.textContent = `Training: ${settings.trainingMode ? "On" : "Off"}`;
      trainingModeBtn.setAttribute("aria-pressed", String(settings.trainingMode));
    });
  }

  if (fieldModeBtn) {
    fieldModeBtn.addEventListener("click", () => {
      pointer.repel = !pointer.repel;
      fieldModeBtn.textContent = `Field: ${pointer.repel ? "Repel" : "Attract"}`;
      fieldModeBtn.setAttribute("aria-pressed", String(pointer.repel));
    });
  }

  if (burstBtn) {
    burstBtn.addEventListener("click", () => spawnSignalBurst(2));
  }

  if (emailBtn) {
    emailBtn.addEventListener("click", async () => {
      const value = "david@wbanalytics.dev";
      try {
        await navigator.clipboard.writeText(value);
        showToast("Email copied ✔");
      } catch {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.style.position = "absolute";
        helper.style.left = "-9999px";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
        showToast("Email copied ✔");
      }
    });
  }

  let resizeQueued = false;
  window.addEventListener("resize", () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
      buildEdgeIndex();
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
  });

  resize();
  buildEdgeIndex();
  for (let i = 0; i < edgeNoise.length; i += 1) {
    edgeNoise[i] = Math.random() - 0.5;
  }
  window.__nnBooted = true;
  requestAnimationFrame(tick);
}

const canvas = document.getElementById("nnCanvas");
const ctx = canvas.getContext("2d");

const complexityInput = document.getElementById("complexity");
const tempoInput = document.getElementById("tempo");
const fieldModeBtn = document.getElementById("fieldMode");
const burstBtn = document.getElementById("burst");
const emailBtn = document.getElementById("copyEmail");
const toast = document.getElementById("toast");

const pointer = { x: 0, y: 0, active: false, repel: false };
let w = 0;
let h = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let t = 0;

const layers = [10, 16, 24, 16, 10];
const nodes = [];
const edges = [];
const particles = [];
const ripples = [];

let complexity = Number(complexityInput.value);
let tempo = Number(tempoInput.value);

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildNetwork();
}

function buildNetwork() {
  nodes.length = 0;
  edges.length = 0;
  particles.length = 0;

  const leftPad = Math.max(70, w * 0.09);
  const rightPad = Math.max(70, w * 0.09);
  const topPad = Math.max(100, h * 0.17);
  const bottomPad = Math.max(95, h * 0.19);
  const usableW = Math.max(220, w - leftPad - rightPad);
  const usableH = Math.max(220, h - topPad - bottomPad);

  layers.forEach((count, li) => {
    const x = leftPad + (li / (layers.length - 1)) * usableW;
    for (let i = 0; i < count; i += 1) {
      const y = topPad + ((i + 0.5) / count) * usableH;
      nodes.push({
        layer: li,
        idx: i,
        x,
        y,
        px: x,
        py: y,
        energy: Math.random(),
        phase: Math.random() * Math.PI * 2,
      });
    }
  });

  const layerOffsets = [];
  let sum = 0;
  for (const n of layers) {
    layerOffsets.push(sum);
    sum += n;
  }

  for (let li = 0; li < layers.length - 1; li += 1) {
    const fromStart = layerOffsets[li];
    const toStart = layerOffsets[li + 1];
    for (let a = 0; a < layers[li]; a += 1) {
      for (let b = 0; b < layers[li + 1]; b += 1) {
        edges.push({
          from: fromStart + a,
          to: toStart + b,
          weight: Math.random() * 2 - 1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }
}

function spawnParticle(force = 1) {
  const edge = edges[(Math.random() * edges.length) | 0];
  if (!edge) return;
  particles.push({
    edge,
    progress: 0,
    speed: (0.006 + Math.random() * 0.012) * tempo * (0.85 + force * 0.6),
    hue: Math.random() < 0.5 ? 176 : 257,
    size: 1.3 + Math.random() * 2.4,
  });
}

function spawnBurst(force = 1.8) {
  for (let i = 0; i < 80 * force; i += 1) {
    spawnParticle(force);
  }
  ripples.push({
    x: pointer.active ? pointer.x : w * 0.5,
    y: pointer.active ? pointer.y : h * 0.52,
    radius: 10,
    max: Math.max(w, h) * 0.8,
    life: 1,
  });
}

function updateNodes() {
  for (const n of nodes) {
    const wobble = 7 * complexity;
    const ox = Math.sin(t * 0.0019 * tempo + n.phase + n.layer * 0.7) * wobble;
    const oy = Math.cos(t * 0.0015 * tempo + n.phase * 1.3 + n.idx * 0.17) * wobble;

    n.px += (n.x + ox - n.px) * 0.08;
    n.py += (n.y + oy - n.py) * 0.08;

    if (pointer.active) {
      const dx = pointer.x - n.px;
      const dy = pointer.y - n.py;
      const dist = Math.hypot(dx, dy) + 0.0001;
      const pull = (pointer.repel ? -1 : 1) * Math.min(20, 180 / dist) * 0.38 * complexity;
      n.px += (dx / dist) * pull;
      n.py += (dy / dist) * pull;
      n.energy = Math.min(1.4, n.energy + 0.004);
    }

    n.energy = 0.65 + 0.35 * Math.sin(t * 0.0024 * tempo + n.phase + n.layer);
  }
}

function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "rgba(10, 16, 38, 0.45)");
  bg.addColorStop(1, "rgba(6, 8, 18, 0.68)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 34; i += 1) {
    const x = ((i * 1337 + t * 0.016 * (i % 5 + 1)) % (w + 120)) - 60;
    const y = ((i * 827 + t * 0.011 * (i % 7 + 1)) % (h + 120)) - 60;
    ctx.fillStyle = `hsla(${190 + (i % 3) * 32}, 90%, 75%, ${0.08 + (i % 8) * 0.01})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEdges() {
  for (const e of edges) {
    const a = nodes[e.from];
    const b = nodes[e.to];
    const signal = 0.5 + 0.5 * Math.sin(t * 0.0018 * tempo + e.phase);
    const weightImpact = Math.abs(e.weight) * 0.75;
    const alpha = (0.05 + signal * 0.22 + weightImpact * 0.2) * complexity;
    ctx.strokeStyle = `hsla(${e.weight > 0 ? 177 : 272}, 92%, 70%, ${Math.min(0.72, alpha)})`;
    ctx.lineWidth = 0.5 + weightImpact * 1.3;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }
}

function drawNodes() {
  for (const n of nodes) {
    const radius = 2 + n.energy * 3.2 * complexity;
    ctx.shadowColor = "rgba(123, 97, 255, 0.9)";
    ctx.shadowBlur = 14 + n.energy * 8;
    ctx.fillStyle = `hsla(${190 + n.layer * 13}, 95%, ${64 + n.energy * 15}%, ${0.66 + n.energy * 0.18})`;
    ctx.beginPath();
    ctx.arc(n.px, n.py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function updateAndDrawParticles() {
  const spawnRate = 2 + complexity * 4;
  for (let i = 0; i < spawnRate; i += 1) {
    if (Math.random() < 0.7) spawnParticle();
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.progress += p.speed;
    if (p.progress >= 1) {
      particles.splice(i, 1);
      continue;
    }

    const from = nodes[p.edge.from];
    const to = nodes[p.edge.to];
    const x = from.px + (to.px - from.px) * p.progress;
    const y = from.py + (to.py - from.py) * p.progress;

    ctx.fillStyle = `hsla(${p.hue}, 100%, 74%, 0.95)`;
    ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.95)`;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function updateRipples() {
  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const r = ripples[i];
    r.radius += 7 * tempo;
    r.life -= 0.013;
    if (r.radius > r.max || r.life <= 0) {
      ripples.splice(i, 1);
      continue;
    }

    ctx.strokeStyle = `hsla(182, 100%, 75%, ${r.life * 0.7})`;
    ctx.lineWidth = 1.5 + r.life * 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function render() {
  t += 16.67;
  drawBackground();
  updateNodes();
  drawEdges();
  updateAndDrawParticles();
  drawNodes();
  updateRipples();
  requestAnimationFrame(render);
}

canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  spawnBurst(1.6);
});

complexityInput.addEventListener("input", () => {
  complexity = Number(complexityInput.value);
});

tempoInput.addEventListener("input", () => {
  tempo = Number(tempoInput.value);
});

fieldModeBtn.addEventListener("click", () => {
  pointer.repel = !pointer.repel;
  fieldModeBtn.textContent = `Field: ${pointer.repel ? "Repel" : "Attract"}`;
  fieldModeBtn.setAttribute("aria-pressed", String(pointer.repel));
});

burstBtn.addEventListener("click", () => spawnBurst(2.2));

function showToast(message) {
  toast.textContent = message;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.textContent = "";
  }, 1800);
}

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

window.addEventListener("resize", resize);
resize();
spawnBurst(1.8);
render();

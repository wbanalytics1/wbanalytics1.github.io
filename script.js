(() => {
  'use strict';

  const canvas = document.getElementById('neural-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

  if (!canvas || !ctx) {
    document.documentElement.classList.add('no-canvas');
    return;
  }

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    introStart: performance.now(),
    introDone: false,
    lastTime: performance.now(),
    running: true,
    pointer: { x: 0, y: 0, active: false, repel: false },
    controls: {
      density: 1,
      tempo: 1,
      learning: 0.04,
      activation: 'sigmoid',
      training: false,
    },
    layers: [],
    nodes: [],
    edges: [],
    pulses: [],
    particles: [],
  };

  const dom = {
    density: document.getElementById('density'),
    tempo: document.getElementById('tempo'),
    learning: document.getElementById('learning'),
    activation: document.getElementById('activation'),
    densityValue: document.getElementById('density-value'),
    tempoValue: document.getElementById('tempo-value'),
    learningValue: document.getElementById('learning-value'),
    trainingToggle: document.getElementById('training-toggle'),
    fieldToggle: document.getElementById('field-toggle'),
    signalBurst: document.getElementById('signal-burst'),
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  function activationCurve(x) {
    switch (state.controls.activation) {
      case 'relu': return Math.max(0, x);
      case 'tanh': return Math.tanh(x);
      default: return 1 / (1 + Math.exp(-x));
    }
  }

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    buildNeuralField();
  }

  function buildNeuralField() {
    const layerSizes = [8, 13, 17, 12, 7];
    const nodes = [];
    const edges = [];
    const layers = [];

    const left = state.width * 0.1;
    const right = state.width * 0.9;
    const top = state.height * 0.2;
    const bottom = state.height * 0.8;

    let nodeIndex = 0;
    for (let l = 0; l < layerSizes.length; l += 1) {
      const count = Math.max(4, Math.round(layerSizes[l] * state.controls.density));
      const layerX = left + ((right - left) * l) / (layerSizes.length - 1);
      const layer = [];

      for (let i = 0; i < count; i += 1) {
        const y = top + ((bottom - top) * (i + 0.5)) / count;
        const node = {
          id: nodeIndex,
          layer: l,
          x: layerX + rand(-10, 10),
          y: y + rand(-12, 12),
          baseX: layerX,
          baseY: y,
          energy: rand(0.1, 0.5),
          bias: rand(-0.25, 0.25),
          phase: rand(0, Math.PI * 2),
        };
        nodes.push(node);
        layer.push(nodeIndex);
        nodeIndex += 1;
      }
      layers.push(layer);
    }

    for (let l = 0; l < layers.length - 1; l += 1) {
      const fromLayer = layers[l];
      const toLayer = layers[l + 1];
      for (let i = 0; i < fromLayer.length; i += 1) {
        for (let j = 0; j < toLayer.length; j += 1) {
          if (Math.random() < 0.74) {
            edges.push({
              from: fromLayer[i],
              to: toLayer[j],
              weight: rand(-1, 1),
              signal: Math.random(),
            });
          }
        }
      }
    }

    state.layers = layers;
    state.nodes = nodes;
    state.edges = edges;
    state.pulses = [];
    state.particles = [];
  }

  function spawnBurst(strength = 1) {
    const count = Math.floor(40 * strength);
    for (let i = 0; i < count; i += 1) {
      const edge = state.edges[(Math.random() * state.edges.length) | 0];
      if (!edge) continue;
      state.pulses.push({ edgeIndex: state.edges.indexOf(edge), t: 0, speed: rand(0.35, 0.95) * state.controls.tempo });
      edge.signal = 1;
    }
  }

  function update(dt, t) {
    const tempo = state.controls.tempo;

    for (let i = 0; i < state.nodes.length; i += 1) {
      const n = state.nodes[i];
      const drift = Math.sin(t * 0.00075 * tempo + n.phase);
      n.x += (n.baseX + drift * 8 - n.x) * Math.min(1, dt * 6);
      n.y += (n.baseY + Math.cos(t * 0.0008 + n.phase) * 6 - n.y) * Math.min(1, dt * 6);

      if (state.pointer.active) {
        const dx = state.pointer.x - n.x;
        const dy = state.pointer.y - n.y;
        const d = Math.hypot(dx, dy) + 0.001;
        const force = (state.pointer.repel ? -1 : 1) * clamp(240 / d, -18, 18);
        n.x += (dx / d) * force * dt * 4;
        n.y += (dy / d) * force * dt * 4;
      }

      const raw = Math.sin(t * 0.001 * tempo + i * 0.25) + n.bias;
      const val = activationCurve(raw);
      n.energy = clamp(typeof val === 'number' ? Math.abs(val) : 0, 0.04, 1.2);
    }

    for (let e = 0; e < state.edges.length; e += 1) {
      const edge = state.edges[e];
      edge.signal *= 0.965;
      edge.signal += 0.014 * Math.sin(t * 0.0012 * tempo + e * 0.09);
      edge.signal = clamp(edge.signal, 0, 1.35);

      if (state.controls.training) {
        const drift = (Math.random() - 0.5) * state.controls.learning * 0.1;
        edge.weight = clamp(edge.weight + drift, -1.4, 1.4);
      }

      if (Math.random() < 0.006 * tempo) {
        state.pulses.push({ edgeIndex: e, t: 0, speed: rand(0.3, 0.92) * tempo });
      }
    }

    for (let i = state.pulses.length - 1; i >= 0; i -= 1) {
      const p = state.pulses[i];
      p.t += dt * p.speed;
      if (p.t >= 1) {
        state.pulses.splice(i, 1);
      }
    }

    if (state.controls.training && Math.random() < 0.09) {
      const n = state.nodes[(Math.random() * state.nodes.length) | 0];
      if (n) {
        state.particles.push({ x: n.x, y: n.y, vx: rand(-18, 18), vy: rand(-14, 14), life: 0.8, hue: 185 + (Math.random() * 70) });
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, state.width, state.height);
    g.addColorStop(0, '#050a18');
    g.addColorStop(1, '#03060f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    const glow = 0.13 + 0.08 * Math.sin(t * 0.0004);
    ctx.fillStyle = `rgba(96, 189, 255, ${glow})`;
    ctx.beginPath();
    ctx.arc(state.width * 0.58, state.height * 0.42, state.width * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNetwork() {
    ctx.lineCap = 'round';

    for (let e = 0; e < state.edges.length; e += 1) {
      const edge = state.edges[e];
      const a = state.nodes[edge.from];
      const b = state.nodes[edge.to];
      const intensity = Math.abs(edge.weight) * 0.16 + edge.signal * 0.25;
      const pos = edge.weight >= 0;

      ctx.strokeStyle = pos
        ? `rgba(108, 236, 255, ${intensity})`
        : `rgba(143, 131, 255, ${intensity})`;
      ctx.lineWidth = pos ? 1.1 : 0.95;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (let i = 0; i < state.pulses.length; i += 1) {
      const pulse = state.pulses[i];
      const edge = state.edges[pulse.edgeIndex];
      if (!edge) continue;
      const a = state.nodes[edge.from];
      const b = state.nodes[edge.to];
      const x = a.x + (b.x - a.x) * pulse.t;
      const y = a.y + (b.y - a.y) * pulse.t;

      ctx.fillStyle = edge.weight >= 0 ? 'rgba(112, 245, 255, 0.95)' : 'rgba(161, 135, 255, 0.9)';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let n = 0; n < state.nodes.length; n += 1) {
      const node = state.nodes[n];
      const hue = 190 + node.layer * 14;
      const alpha = 0.5 + node.energy * 0.45;
      const r = 2 + node.energy * 2.8;
      ctx.fillStyle = `hsla(${hue}, 100%, 72%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      ctx.fillStyle = `hsla(${p.hue}, 100%, 72%, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawIntro(t) {
    const sec = (t - state.introStart) / 1000;
    if (sec > 3.8) {
      state.introDone = true;
      return;
    }

    const cx = state.width * 0.5;
    const cy = state.height * 0.5;

    ctx.fillStyle = 'rgba(2,5,12,0.66)';
    ctx.fillRect(0, 0, state.width, state.height);

    if (sec < 1.2) {
      const p = sec / 1.2;
      ctx.fillStyle = `rgba(145, 236, 255, ${0.28 + p * 0.45})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 2 + p * 11, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (sec < 2.6) {
      const p = (sec - 1.2) / 1.4;
      for (let i = 0; i < 42; i += 1) {
        const angle = (i / 42) * Math.PI * 2;
        const dist = 12 + p * (state.width * 0.13 + (i % 5) * 4);
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        ctx.fillStyle = `rgba(110, 220, 255, ${0.25 + 0.4 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const fade = clamp((sec - 2.6) / 1.2, 0, 1);
    ctx.globalAlpha = 0.35 + fade * 0.65;
    drawNetwork();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!state.running) return;

    try {
      const dt = clamp((now - state.lastTime) / 1000, 0.001, 0.033);
      state.lastTime = now;

      drawBackground(now);
      update(dt, now);

      if (!state.introDone) {
        drawIntro(now);
      } else {
        drawNetwork();
      }

      requestAnimationFrame(frame);
    } catch (error) {
      console.error('Animation halted safely:', error);
      state.running = false;
      canvas.style.opacity = '0';
    }
  }

  function bindControls() {
    const setLabel = (el, value, digits = 2) => { if (el) el.textContent = Number(value).toFixed(digits); };

    setLabel(dom.densityValue, dom.density.value);
    setLabel(dom.tempoValue, dom.tempo.value);
    setLabel(dom.learningValue, dom.learning.value);

    dom.density?.addEventListener('input', () => {
      state.controls.density = Number(dom.density.value);
      setLabel(dom.densityValue, dom.density.value);
      buildNeuralField();
    });

    dom.tempo?.addEventListener('input', () => {
      state.controls.tempo = Number(dom.tempo.value);
      setLabel(dom.tempoValue, dom.tempo.value);
    });

    dom.learning?.addEventListener('input', () => {
      state.controls.learning = Number(dom.learning.value);
      setLabel(dom.learningValue, dom.learning.value);
    });

    dom.activation?.addEventListener('change', () => {
      state.controls.activation = dom.activation.value;
    });

    dom.trainingToggle?.addEventListener('click', () => {
      state.controls.training = !state.controls.training;
      dom.trainingToggle.textContent = `Training: ${state.controls.training ? 'On' : 'Off'}`;
      dom.trainingToggle.setAttribute('aria-pressed', String(state.controls.training));
    });

    dom.fieldToggle?.addEventListener('click', () => {
      state.pointer.repel = !state.pointer.repel;
      dom.fieldToggle.textContent = `Field: ${state.pointer.repel ? 'Repel' : 'Attract'}`;
      dom.fieldToggle.setAttribute('aria-pressed', String(state.pointer.repel));
    });

    dom.signalBurst?.addEventListener('click', () => spawnBurst(1.6));
  }

  function bindPointer() {
    canvas.addEventListener('pointermove', (e) => {
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      state.pointer.active = true;
    }, { passive: true });

    canvas.addEventListener('pointerleave', () => { state.pointer.active = false; }, { passive: true });
    canvas.addEventListener('pointerdown', (e) => {
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      state.pointer.active = true;
      spawnBurst(1.2);
    });
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.running = false;
    } else {
      state.running = true;
      state.lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  });

  bindControls();
  bindPointer();
  resize();
  spawnBurst(1);
  requestAnimationFrame(frame);
})();

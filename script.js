const canvas = document.getElementById("nnCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Define layers and node layout
const layers = [6, 4, 4, 3];
const nodes = [];
const connections = [];
const pulseTrail = [];

// Generate node positions
layers.forEach((count, layerIndex) => {
  const layerNodes = [];
  const x = (canvas.width / (layers.length + 1)) * (layerIndex + 1);
  for (let i = 0; i < count; i++) {
    const y = (canvas.height / (count + 1)) * (i + 1);
    layerNodes.push({ x, y });
  }
  nodes.push(layerNodes);
});

// Create connections between layers
for (let i = 0; i < nodes.length - 1; i++) {
  for (let from of nodes[i]) {
    for (let to of nodes[i + 1]) {
      connections.push({ from, to });
    }
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connections
  ctx.lineWidth = 1;
  connections.forEach(({ from, to }) => {
    ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });

  // Draw nodes
  nodes.flat().forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.fill();
  });

  // Animate pulse through connections
  if (pulseTrail.length > 0) {
    ctx.shadowBlur = 0;
    pulseTrail.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#ff00ff";
      ctx.fill();
    });
  }
}

// Animation loop
let index = 0;
function animate() {
  draw();

  if (index < connections.length) {
    const { from, to } = connections[index];
    const steps = 10;
    for (let step = 0; step <= steps; step++) {
      const x = from.x + (to.x - from.x) * (step / steps);
      const y = from.y + (to.y - from.y) * (step / steps);
      pulseTrail.push({ x, y });
    }
    index++;
  } else {
    index = 0;
    pulseTrail.length = 0;
  }

  requestAnimationFrame(animate);
}

animate();

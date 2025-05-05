const canvas = document.getElementById("network");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const layers = [4, 6, 4];
const nodes = [];
const connections = [];
const spacingX = canvas.width / (layers.length + 1);
const radius = 8;

const neonBlue = "#00ffff";
const gold = "#ffd700";

// List of neon colors to cycle through
const neonColors = ["#00ffff", "#ff00ff", "#39ff14", "#ffd700", "#ff69b4"];
let colorIndex = 0;
let colorTimer = 0;

for (let i = 0; i < layers.length; i++) {
  const layer = [];
  const spacingY = canvas.height / (layers[i] + 1);
  for (let j = 0; j < layers[i]; j++) {
    layer.push({
      x: spacingX * (i + 1),
      y: spacingY * (j + 1)
    });
  }
  nodes.push(layer);
}

// Create connections between layers
for (let i = 0; i < nodes.length - 1; i++) {
  for (let a of nodes[i]) {
    for (let b of nodes[i + 1]) {
      connections.push({ from: a, to: b });
    }
  }
}

let progress = 0;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cycle through neon colors every 30 frames
  colorTimer++;
  if (colorTimer > 30) {
    colorTimer = 0;
    colorIndex = (colorIndex + 1) % neonColors.length;
  }

  // Draw name
  ctx.font = "bold 24px Orbitron, sans-serif";
  ctx.fillStyle = neonColors[colorIndex];
  ctx.shadowColor = neonColors[colorIndex];
  ctx.shadowBlur = 15;
  ctx.fillText("William David Boggs", 20, 30);

  // Draw connections
  for (let conn of connections) {
    ctx.beginPath();
    ctx.moveTo(conn.from.x, conn.from.y);
    ctx.lineTo(conn.to.x, conn.to.y);
    ctx.strokeStyle = neonBlue;
    ctx.shadowColor = neonBlue;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw nodes
  for (let layer of nodes) {
    for (let node of layer) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = neonBlue;
      ctx.shadowColor = neonBlue;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
  }

  // Animate glowing signal
  let conn = connections[Math.floor(progress)];
  if (conn) {
    let t = progress % 1;
    let x = conn.from.x + (conn.to.x - conn.from.x) * t;
    let y = conn.from.y + (conn.to.y - conn.from.y) * t;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = gold;
    ctx.shadowColor = gold;
    ctx.shadowBlur = 20;
    ctx.fill();

    progress += 0.02;
    if (progress >= connections.length) progress = 0;
  }

  requestAnimationFrame(draw);
}

draw();

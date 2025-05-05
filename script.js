const canvas = document.getElementById("network");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
});

const layers = [5, 5, 5]; // 3 layers with 5 nodes each
const nodes = [];
const connections = [];

function createNetwork() {
  nodes.length = 0;
  connections.length = 0;

  const spacingX = canvas.width / (layers.length + 1);
  const spacingY = canvas.height / (layers[0] + 1);

  layers.forEach((count, layerIndex) => {
    for (let i = 0; i < count; i++) {
      const x = spacingX * (layerIndex + 1);
      const y = spacingY * (i + 1);
      nodes.push({ x, y, layer: layerIndex });
    }
  });

  nodes.forEach((from) => {
    nodes.forEach((to) => {
      if (to.layer === from.layer + 1) {
        connections.push({ from, to, progress: 0 });
      }
    });
  });
}

function drawNode(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#00f7ff";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00f7ff";
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawConnection(from, to, progress) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = "rgba(0, 247, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glow effect traveling
  const glowX = from.x + (to.x - from.x) * progress;
  const glowY = from.y + (to.y - from.y) * progress;
  ctx.beginPath();
  ctx.arc(glowX, glowY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#00f7ff";
  ctx.fill();
  ctx.shadowBlur = 0;
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  connections.forEach(conn => {
    conn.progress += 0.01;
    if (conn.progress > 1) conn.progress = 0;
    drawConnection(conn.from, conn.to, conn.progress);
  });

  nodes.forEach(node => drawNode(node.x, node.y));
  requestAnimationFrame(animate);
}

createNetwork();
animate();

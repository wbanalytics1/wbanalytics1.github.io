const canvas = document.getElementById("networkCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const layers = [4, 6, 4, 2]; // layers of the network
const nodes = [];
const connections = [];

// Layout nodes
for (let i = 0; i < layers.length; i++) {
  const layerNodes = [];
  for (let j = 0; j < layers[i]; j++) {
    layerNodes.push({
      x: (canvas.width / (layers.length + 1)) * (i + 1),
      y: (canvas.height / (layers[i] + 1)) * (j + 1),
    });
  }
  nodes.push(layerNodes);
}

// Create connection paths
for (let i = 0; i < nodes.length - 1; i++) {
  for (let a = 0; a < nodes[i].length; a++) {
    for (let b = 0; b < nodes[i + 1].length; b++) {
      connections.push({
        from: nodes[i][a],
        to: nodes[i + 1][b],
        progress: 0,
      });
    }
  }
}

let activeConnection = 0;

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connections
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.5;
  connections.forEach(conn => {
    ctx.beginPath();
    ctx.moveTo(conn.from.x, conn.from.y);
    ctx.lineTo(conn.to.x, conn.to.y);
    ctx.stroke();
  });

  // Draw nodes
  nodes.flat().forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.fill();
  });

  // Animate signal
  if (connections.length > 0) {
    const conn = connections[activeConnection];
    const { from, to, progress } = conn;

    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ff00ff";
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 15;
    ctx.fill();

    conn.progress += 0.02;
    if (conn.progress >= 1) {
      conn.progress = 0;
      activeConnection = (activeConnection + 1) % connections.length;
    }
  }

  requestAnimationFrame(animate);
}

animate();

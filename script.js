const canvas = document.getElementById('nnCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create nodes
const nodes = [];
const nodeCount = 50;
for (let i = 0; i < nodeCount; i++) {
  nodes.push({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5
  });
}

// Create connections
const connections = [];
for (let i = 0; i < nodeCount; i++) {
  for (let j = i + 1; j < nodeCount; j++) {
    if (Math.random() < 0.05) {
      connections.push([i, j]);
    }
  }
}

// Glowing ball
let path = [];
let currentConnection = 0;
function createPath() {
  path = [];
  const shuffled = nodes.slice().sort(() => 0.5 - Math.random());
  for (let i = 0; i < shuffled.length; i++) {
    path.push(shuffled[i]);
  }
  currentConnection = 0;
}
createPath();

let ballPos = { x: path[0].x, y: path[0].y };
let targetIndex = 1;
let speed = 2;

function animate() {
  ctx.clearRect(0, 0, width, height);

  // Update node positions
  for (let node of nodes) {
    node.x += node.vx;
    node.y += node.vy;

    if (node.x < 0 || node.x > width) node.vx *= -1;
    if (node.y < 0 || node.y > height) node.vy *= -1;
  }

  // Draw connections
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 0.5;
  for (let [i, j] of connections) {
    ctx.beginPath();
    ctx.moveTo(nodes[i].x, nodes[i].y);
    ctx.lineTo(nodes[j].x, nodes[j].y);
    ctx.stroke();
  }

  // Draw nodes
  for (let node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();
  }

  // Move glowing ball
  if (path.length > 1) {
    let target = path[targetIndex];
    let dx = target.x - ballPos.x;
    let dy = target.y - ballPos.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed) {
      ballPos.x = target.x;
      ballPos.y = target.y;
      targetIndex++;
      if (targetIndex >= path.length) {
        createPath();
        ballPos.x = path[0].x;
        ballPos.y = path[0].y;
        targetIndex = 1;
      }
    } else {
      ballPos.x += (dx / dist) * speed;
      ballPos.y += (dy / dist) * speed;
    }

    // Draw glowing ball
    ctx.beginPath();
    ctx.arc(ballPos.x, ballPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'gold';
    ctx.shadowColor = 'gold';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  requestAnimationFrame(animate);
}

animate();

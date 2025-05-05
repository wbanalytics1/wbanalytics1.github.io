const canvas = document.getElementById("nnCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.glow = 0;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + this.glow, 0, Math.PI * 2);
    ctx.fillStyle = this.glow > 0 ? "#0ff" : "#333";
    ctx.shadowBlur = this.glow > 0 ? 20 : 0;
    ctx.shadowColor = "#0ff";
    ctx.fill();
    ctx.closePath();
  }
}

class Connection {
  constructor(from, to) {
    this.from = from;
    this.to = to;
    this.active = false;
    this.progress = 0;
  }

  draw() {
    const dx = this.to.x - this.from.x;
    const dy = this.to.y - this.from.y;
    const currentX = this.from.x + dx * this.progress;
    const currentY = this.from.y + dy * this.progress;

    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#0ff";
    ctx.stroke();
    ctx.closePath();

    this.progress += 0.02;
    if (this.progress >= 1) {
      this.progress = 0;
    }
  }
}

const layers = [4, 6, 4];
const nodes = [];
const connections = [];

function init() {
  const spacingX = canvas.width / (layers.length + 1);
  for (let i = 0; i < layers.length; i++) {
    const layer = [];
    const spacingY = canvas.height / (layers[i] + 1);
    for (let j = 0; j < layers[i]; j++) {
      const x = spacingX * (i + 1);
      const y = spacingY * (j + 1);
      layer.push(new Node(x, y));
    }
    nodes.push(layer);
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    for (const from of nodes[i]) {
      for (const to of nodes[i + 1]) {
        connections.push(new Connection(from, to));
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const conn of connections) {
    conn.draw();
  }

  for (const layer of nodes) {
    for (const node of layer) {
      node.draw();
    }
  }

  requestAnimationFrame(animate);
}

init();
animate();

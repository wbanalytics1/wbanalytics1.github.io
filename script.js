const canvas = document.getElementById('nnCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

const layers = [3, 5, 2];
const nodes = [];

function setupNodes() {
  const layerWidth = canvas.width / (layers.length + 1);
  for (let i = 0; i < layers.length; i++) {
    const layer = [];
    const layerHeight = canvas.height / (layers[i] + 1);
    for (let j = 0; j < layers[i]; j++) {
      const x = layerWidth * (i + 1);
      const y = layerHeight * (j + 1);
      layer.push(new Node(x, y));
    }
    nodes.push(layer);
  }
}
setupNodes();

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw lines
  ctx.lineWidth = 1;
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const from of nodes[i]) {
      for (const to of nodes[i + 1]) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#88ffff33';
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  for (const layer of nodes) {
    for (const node of layer) {
      node.draw();
    }
  }

  requestAnimationFrame(animate);
}
animate();

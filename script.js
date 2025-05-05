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
    this.radius = 8;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0ff';
    ctx.fill();
  }
}

const layers = [3, 5, 4, 2];
const nodes = [];

const spacingX = canvas.width / (layers.length + 1);
for (let i = 0; i < layers.length; i++) {
  const layer = [];
  const spacingY = canvas.height / (layers[i] + 1);
  for (let j = 0; j < layers[i]; j++) {
    layer.push(new Node(spacingX * (i + 1), spacingY * (j + 1)));
  }
  nodes.push(layer);
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connections
  ctx.strokeStyle = '#0a0';
  nodes.forEach((layer, i) => {
    if (i < nodes.length - 1) {
      layer.forEach(node => {
        nodes[i + 1].forEach(nextNode => {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(nextNode.x, nextNode.y);
          ctx.stroke();
        });
      });
    }
  });

  // Draw nodes
  nodes.flat().forEach(node => node.draw());

  requestAnimationFrame(animate);
}
animate();

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Futuristic Neural Network</title>
  <link rel="stylesheet" href="style.css" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
  </style>
</head>
<body>
  <canvas id="neuralCanvas"></canvas>
  <script>
    const canvas = document.getElementById("neuralCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodeCount = 7;
    const layerCount = 4;
    const nodeRadius = 8;
    const spacingX = canvas.width / (layerCount + 1);
    const spacingY = canvas.height / (nodeCount + 1);

    const nodes = [];

    for (let i = 0; i < layerCount; i++) {
      nodes[i] = [];
      for (let j = 0; j < nodeCount; j++) {
        const x = spacingX * (i + 1);
        const y = spacingY * (j + 1);
        nodes[i].push({ x, y });
      }
    }

    function drawConnections() {
      ctx.strokeStyle = "rgba(0, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < layerCount - 1; i++) {
        for (let from of nodes[i]) {
          for (let to of nodes[i + 1]) {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          }
        }
      }
    }

    function drawNodes() {
      for (let layer of nodes) {
        for (let node of layer) {
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius * 2);
          gradient.addColorStop(0, "#0ff");
          gradient.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(node.x, node.y, nodeRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = "#0ff";
          ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawConnections();
      drawNodes();
      requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  </script>
</body>
</html>

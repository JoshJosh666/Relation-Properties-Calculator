// ------------------ Show/Hide Tools ------------------
function showTool(toolName) {
  document.getElementById("mainMenu").classList.remove("active");
  document.getElementById(toolName + "Tool").classList.add("active");
}

function goBack() {
  document.querySelectorAll(".tool").forEach(t => t.classList.remove("active"));
  document.getElementById("mainMenu").classList.add("active");
  const canvas = document.getElementById("graphCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("result").innerText = "";
}

// ------------------ Example Generator ------------------
function generateExample(toolName) {
  let elements;
  if (toolName === 'checker') {
    elements = ['1', '2', '3', '4', '5']; // Use numbers for checker tool
  } else {
    elements = ['A', 'B', 'C', 'D', 'E']; // Keep letters for graph tool
  }

  // Use 3, 4, or 5 elements for the example
  const numElements = Math.floor(Math.random() * 3) + 3;
  const activeElements = elements.slice(0, numElements);

  // Generate a random number of pairs
  const numPairs = Math.floor(Math.random() * 5) + numElements;
  const pairs = new Set(); // Use a Set to avoid duplicate pairs

  while (pairs.size < numPairs && pairs.size < numElements * numElements) {
    const a = activeElements[Math.floor(Math.random() * activeElements.length)];
    const b = activeElements[Math.floor(Math.random() * activeElements.length)];
    pairs.add(`(${a},${b})`);
  }

  const exampleString = Array.from(pairs).join(', ');
  const inputId = toolName === 'checker' ? 'checkerInput' : 'graphInput';
  document.getElementById(inputId).value = exampleString;
}

// ------------------ Helper: Parse Input String ------------------
/**
 * Parses a string of ordered pairs like "(a,b), (c,d)" into structured data.
 * @param {string} input The raw string from the textarea.
 * @returns {{relations: [string, string][], elements: string[]} | null}
 */
function parsePairs(input) {
  const relations = [];
  const elements = new Set();
  // Regex to find all pairs, allowing for different spacing
  const pairRegex = /\(\s*([A-Za-z0-9]+)\s*,\s*([A-Za-z0-9]+)\s*\)/g;
  let match;

  while ((match = pairRegex.exec(input)) !== null) {
    const a = match[1];
    const b = match[2];
    relations.push([a, b]);
    elements.add(a);
    elements.add(b);
  }

  // If input is not empty but no pairs were found, format is invalid
  if (input.trim() !== "" && relations.length === 0) {
    return null;
  }

  return { relations, elements: Array.from(elements) };
}

// ------------------ Relation Property Checker ------------------
function checkRelation() {
  const input = document.getElementById("checkerInput").value;
  const parsedData = parsePairs(input);

  if (!parsedData) {
    alert("Invalid input format. Please use pairs like (1,2), (a,b).");
    return;
  }

  const { relations, elements } = parsedData;
 
  const relationSet = new Set(relations.map(p => p.join(',')));

  //relation property
  const isReflexive = elements.every(x => relationSet.has(`${x},${x}`));
  const isSymmetric = relations.every(([a, b]) => relationSet.has(`${b},${a}`));
  const isAntisymmetric = relations.every(([a, b]) => a === b || !relationSet.has(`${b},${a}`));

  let isTransitive = true;
  for (const [a, b] of relations) {
    for (const [c, d] of relations) {
      if (b === c && !relationSet.has(`${a},${d}`)) {
        isTransitive = false;
        break;
      }
    }
    if (!isTransitive) break;
  }

  // closure calculation
  const toPairs = set => Array.from(set).map(p => p.split(','));

  const reflexiveClosure = (relSet, elemSet) => {
    const closure = new Set(relSet);
    for (const x of elemSet) closure.add(`${x},${x}`);
    return toPairs(closure);
  };

  const symmetricClosure = (relSet) => {
    const closure = new Set(relSet);
    for (const p of closure) {
      const [a, b] = p.split(',');
      closure.add(`${b},${a}`);
    }
    return toPairs(closure);
  };

  const transitiveClosure = (relations) => {
    const closure = [...relations];
    let newPairsAdded = true;
    while (newPairsAdded) {
      newPairsAdded = false;
      const pairsToAdd = [];
      for (const [a, b] of closure) {
        for (const [c, d] of closure) {
          if (b === c) {
            const newPairStr = `${a},${d}`;
            if (!closure.some(p => p.join(',') === newPairStr) && !pairsToAdd.some(p => p.join(',') === newPairStr)) {
              pairsToAdd.push([a, d]);
            }
          }
        }
      }
      if (pairsToAdd.length > 0) {
        closure.push(...pairsToAdd);
        newPairsAdded = true;
      }
    }
    return closure;
  };

  const formatPairs = (pairs) => `{ ${pairs.map(([a, b]) => `(${a},${b})`).join(", ")} }`;

  // --- Display Results ---
  let resultText = `Elements: { ${elements.join(", ")} }\n\n`;
  resultText += `Reflexive: ${isReflexive ? "✅ Yes" : "❌ No"}\n`;
  resultText += `Symmetric: ${isSymmetric ? "✅ Yes" : "❌ No"}\n`;
  resultText += `Antisymmetric: ${isAntisymmetric ? "✅ Yes" : "❌ No"}\n`;
  resultText += `Transitive: ${isTransitive ? "✅ Yes" : "❌ No"}\n\n`;

  if (isReflexive && isSymmetric && isTransitive) {
    resultText += "✨ This relation is an Equivalence Relation!\n\n";
  } else {
    resultText += "⚙️ This is NOT an equivalence relation.\n\n";
  }

  resultText += `Reflexive Closure: ${formatPairs(reflexiveClosure(relationSet, elements))}\n`;
  resultText += `Symmetric Closure: ${formatPairs(symmetricClosure(relationSet))}\n`;
  resultText += `Transitive Closure: ${formatPairs(transitiveClosure(relations))}`;

  document.getElementById("result").innerText = resultText;
}

// ------------------ Interactive Relation Graph ------------------

// Store graph state to manage interactivity
const graphState = {
  nodes: [],
  relations: [],
  nodePositions: {},
  nodeRadius: 25,
  canvas: null,
  ctx: null,
};

/**
 * Main function to initialize and draw the graph from the textarea.
 */
function drawRelation() {
  const input = document.getElementById("graphInput").value;
  const parsedData = parsePairs(input);

  graphState.canvas = document.getElementById("graphCanvas");
  graphState.ctx = graphState.canvas.getContext("2d");

  // Clear everything and remove old listeners
  graphState.ctx.clearRect(0, 0, graphState.canvas.width, graphState.canvas.height);

  if (!parsedData || parsedData.elements.length === 0) {
    if (input.trim() !== "") alert("Invalid input format. Please use pairs like (1,2), (a,b).");
    return;
  }

  // Initialize graph state
  graphState.relations = parsedData.relations;
  graphState.nodes = parsedData.elements;
  calculateNodePositions();

  redrawGraph();
}

/**
 * Calculates and stores the positions of nodes in a circle.
 */
function calculateNodePositions() {
  const n = graphState.nodes.length;
  const radius = 150;
  const centerX = graphState.canvas.width / 2;
  const centerY = graphState.canvas.height / 2;
  graphState.nodePositions = {};

  graphState.nodes.forEach((node, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    graphState.nodePositions[node] = { x, y };
  });
}

/**
 * Redraws the entire graph based on the current graphState.
 */
function redrawGraph() {
  // Get computed styles to ensure colors match the current theme
  const computedStyles = getComputedStyle(document.body);
  const nodeFill = computedStyles.getPropertyValue('--primary-color').trim();
  const edgeColor = computedStyles.getPropertyValue('--secondary-color').trim();
  const nodeText = computedStyles.getPropertyValue('--button-text-color').trim();
  const nodeStroke = "#0f172a"; // Dark slate background for contrast

  const { ctx, canvas, nodes, relations, nodePositions, nodeRadius } = graphState;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- 1. Draw Nodes ---
  ctx.font = "bold 16px Poppins";
  nodes.forEach(node => {
    const { x, y } = nodePositions[node];
    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = nodeFill;
    ctx.fill();
    ctx.strokeStyle = nodeStroke;
    ctx.stroke();
    ctx.fillStyle = nodeText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node, x, y);
  });

  // --- 2. Draw Relations (Edges) ---
  const relationSet = new Set(relations.map(p => p.join(',')));
  ctx.strokeStyle = edgeColor;
  ctx.fillStyle = edgeColor;
  ctx.lineWidth = 2;
  relations.forEach(([a, b]) => {
    drawEdge(a, b, relationSet.has(`${b},${a}`), false);
  });
  // Reset to default for preview line
  ctx.lineWidth = 1;
}

function drawEdge(a, b, isSymmetric, isHovered) {
  const { ctx, nodePositions, nodeRadius } = graphState;
  const from = nodePositions[a];
  const to = nodePositions[b];
  if (!from || !to) return;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  // --- Draw Loop (a,a) ---
  if (a === b) {
    const loopRadius = nodeRadius * 0.8;
    const loopCenterX = from.x - nodeRadius * 1.5;
    const loopCenterY = from.y;

    ctx.beginPath();
    ctx.arc(loopCenterX, loopCenterY, loopRadius, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Arrowhead for the loop
    const arrowAngle = Math.PI / 2 + 0.2; // Position on the arc
    const arrowX = loopCenterX + loopRadius * Math.cos(arrowAngle);
    const arrowY = loopCenterY + loopRadius * Math.sin(arrowAngle);
    drawArrowhead(arrowX, arrowY, arrowAngle - Math.PI / 2);
    return;
  }

  // --- Draw Curved or Straight Edge ---
  const dist = Math.sqrt(dx * dx + dy * dy);
  const endX = to.x - nodeRadius * Math.cos(angle);
  const endY = to.y - nodeRadius * Math.sin(angle);

  // If the relation is symmetric between a and b, draw curved lines.
  // Otherwise, draw a straight line.
  if (isSymmetric && a !== b) {
    const curveAmount = 30; // How much the line will curve
    const midX = from.x + dx / 2;
    const midY = from.y + dy / 2;

    // Find a point perpendicular to the line's midpoint to use as a curve control point
    const normalAngle = angle - Math.PI / 2;
    // For symmetric pairs, we need to draw two separate curves.
    // We can use the order of the node names (e.g., 'A' < 'B') to decide
    // which side the curve should be on, ensuring they are always opposite.
    const curveDirection = a < b ? 1 : -1;
    const controlX = midX + curveAmount * curveDirection * Math.cos(normalAngle);
    const controlY = midY + curveAmount * Math.sin(normalAngle);

    // Draw the curved line from A to B
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
    ctx.stroke();

    // To calculate the arrowhead position on a quadratic curve, we need the tangent
    // at the end of the curve. The tangent angle is the angle of the line from the
    // control point to the end point.
    const tangentAngle = Math.atan2(to.y - controlY, to.x - controlX);

    // Calculate the point on the node's edge for the arrowhead
    const arrowEndX = to.x - nodeRadius * Math.cos(tangentAngle);
    const arrowEndY = to.y - nodeRadius * Math.sin(tangentAngle);
    drawArrowhead(arrowEndX, arrowEndY, tangentAngle);

  } else { // This handles both non-symmetric relations and the case where a line is part of a symmetric pair but is being drawn as a straight line for simplicity.
    // Straight line for non-symmetric relation (or if symmetric drawing is simplified)
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY); // Draw to the edge of the circle, not the center
    ctx.stroke();

    // Calculate the point on the node's edge for the arrowhead
    const arrowEndX = to.x - nodeRadius * Math.cos(angle);
    const arrowEndY = to.y - nodeRadius * Math.sin(angle);
    drawArrowhead(arrowEndX, arrowEndY, angle);
  }
}

/**
 * Helper to draw an arrowhead at a specific point and angle.
 * @param {number} x - The x-coordinate of the arrowhead tip.
 * @param {number} y - The y-coordinate of the arrowhead tip.
 * @param {number} angle - The angle of the line in radians.
 */
function drawArrowhead(x, y, angle) {
  const { ctx } = graphState;
  const headSize = 10;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - headSize * Math.cos(angle - Math.PI / 6), y - headSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - headSize * Math.cos(angle + Math.PI / 6), y - headSize * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
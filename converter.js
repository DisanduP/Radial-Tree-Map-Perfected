#!/usr/bin/env node
const fs = require('fs');
const csv = require('csv-parser');
const { create } = require('xmlbuilder2');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('input', { alias: 'i', type: 'string', description: 'Input CSV file path', demandOption: true })
  .option('output', { alias: 'o', type: 'string', description: 'Output Drawio file path', default: 'sunburst_layout.drawio' })
  .argv;

// 1. Build the Hierarchy
const buildTree = (data) => {
  const root = { id: 'root', label: 'Center', value: 0, children: {}, level: 0 };

  data.forEach(row => {
    // Try to find Path/Value columns loosely
    const pathStr = row.Path || row.path || Object.values(row)[0];
    let valStr = row.Value || row.value || Object.values(row)[1];
    
    // Clean up value (remove commas, currency symbols)
    if (typeof valStr === 'string') {
        valStr = valStr.replace(/[^0-9.]/g, '');
    }
    const val = parseFloat(valStr) || 1; // Default to 1 if no value

    if (!pathStr) return;

    const parts = pathStr.split('/').map(s => s.trim()).filter(s => s);
    let currentLevel = root;

    parts.forEach((part, index) => {
      if (!currentLevel.children[part]) {
        currentLevel.children[part] = {
          id: `node_${Math.random().toString(36).substr(2, 9)}`,
          label: part,
          value: 0, // Will sum up later
          children: {},
          level: index + 1
        };
      }
      currentLevel = currentLevel.children[part];
    });
    // Add value to the leaf
    currentLevel.value += val;
  });
  return root;
};

// 2. Aggregate Values (Recursive)
// We need total values at parent levels to know how wide the angle wedge should be
const aggregateValues = (node) => {
  let childSum = 0;
  const children = Object.values(node.children);
  
  if (children.length > 0) {
    children.forEach(child => {
      childSum += aggregateValues(child);
    });
    node.value = childSum; // Parent value is sum of children
  }
  return node.value;
};

// 3. Calculate Coordinates (The Math Part)
const calculateLayout = (node, startAngle, endAngle) => {
  const RADIUS_STEP = 160; // Distance between rings
  const OFFSET_X = 2000;   // Center on canvas so it doesn't get cut off
  const OFFSET_Y = 2000;

  // Mid-angle for placing the node itself
  const midAngle = startAngle + (endAngle - startAngle) / 2;
  
  // Polar to Cartesian conversion
  const r = node.level * RADIUS_STEP;
  node.x = OFFSET_X + r * Math.cos(midAngle);
  node.y = OFFSET_Y + r * Math.sin(midAngle);

  // Distribute angles to children based on their value
  let currentStart = startAngle;
  const totalValue = node.value;

  Object.values(node.children).forEach(child => {
    // Percentage of the pie this child gets
    const share = child.value / totalValue;
    const angleSpan = (endAngle - startAngle) * share;
    const childEnd = currentStart + angleSpan;

    calculateLayout(child, currentStart, childEnd);
    currentStart = childEnd;
  });
};

// 4. Generate XML
const generateDrawioXml = (treeData) => {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('mxfile', { host: 'Electron', agent: 'SunburstCLI' })
    .ele('diagram', { id: 'diagram_1', name: 'Sunburst Auto-Layout' })
    .ele('mxGraphModel', { dx: '4000', dy: '4000', grid: '1', gridSize: '10', guides: '1', tooltips: '1', connect: '1', arrows: '1', fold: '1', page: '1', pageScale: '1', pageWidth: '4000', pageHeight: '4000', math: '0', shadow: '0' })
    .ele('root');

  doc.ele('mxCell', { id: '0' });
  doc.ele('mxCell', { id: '1', parent: '0' });

  const addNodeToXml = (node, parentId) => {
    // Style: Circle, white fill, blue outline
    const style = "ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#dae8fc;strokeColor=#6c8ebf;";
    const size = 80;

    // Adjust geometry so (x,y) is the center of the circle, not top-left
    const geomX = node.x - (size / 2);
    const geomY = node.y - (size / 2);

    doc.ele('mxCell', {
      id: node.id,
      value: `${node.label}\n(${node.value})`,
      style: style,
      parent: '1',
      vertex: '1'
    }).ele('mxGeometry', { x: geomX, y: geomY, width: size, height: size, as: 'geometry' }).up();

    // Edge
    if (parentId !== '1') {
      doc.ele('mxCell', {
        id: `edge_${node.id}`,
        style: "edgeStyle=none;html=1;endArrow=none;strokeColor=#999999;",
        parent: '1',
        source: parentId,
        target: node.id,
        edge: '1'
      }).ele('mxGeometry', { relative: '1', as: 'geometry' }).up();
    }

    Object.values(node.children).forEach(child => addNodeToXml(child, node.id));
  };

  addNodeToXml(treeData, '1');
  return doc.end({ prettyPrint: true });
};

// Main
const results = [];
fs.createReadStream(argv.input)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`Processing...`);
    
    const tree = buildTree(results);
    aggregateValues(tree);
    
    // Layout: 0 to 2*PI (360 degrees)
    calculateLayout(tree, 0, 2 * Math.PI);
    
    const xml = generateDrawioXml(tree);
    fs.writeFileSync(argv.output, xml);
    console.log(`\nSuccess! Generated ${argv.output} with radial coordinates.`);
  });
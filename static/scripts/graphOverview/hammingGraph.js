"use strict";

// Define graph's canvas
let element = d3.select("#hamming-graph").node();
let boundingRect = element.getBoundingClientRect();
let widthGraphSVG = boundingRect.width;
let heightGraphSVG = boundingRect.height;

let widthGraph = 0.95 * widthGraphSVG;
let heightGraph = 0.6 * heightGraphSVG;
let heightDegree = 0.15 * heightGraph;

let sectionBB = {
  x: 0.03 * widthGraph,
  y: 0.05 * heightDegree,
  width: 0.96 * widthGraph,
  height: 0.9 * heightDegree,
};
let sectionHeights = [];

// Graph nodes, edges and attribute description
let nodes, edges, groupings;
let attributesOrder, mapQuestions;

// Define node and datapoint radius
let radiusMin, radiusMax;
let radiusInner = 5;

// Define node and datapoint colors
const colorNode = "#6495ED50",
  colorDatapoint = "#1a237e";

const pinkDark = "rgb(181, 9, 101)";
  
const colorLinksHD1 = "#ADD8E640",
  colorLinksSameGroup = "#FFB6C140";

let degrees;

let simulationGraph;
let questionForces = new Set([]);
let numberRespondentsRange;

let graphSVG = d3
  .select("#hamming-graph")
  .append("svg")
  .attr("width", widthGraphSVG);


let overviewItemHeader = graphSVG.append("g")
                               .attr("width", widthGraph)
                               .attr("height", heightAttributeOverviewHeader)
                               .attr("transform", `translate(0, ${0.02 * heightBeeswarm})`);

overviewItemHeader.append("text")
                   .attr("class", "view-label")
                   .text("Item Relation Overview");

appendTooltipHint(overviewItemHeader, 190, -rQuestionMark, hintsObject["itemOverview"]);

let textsItemOverview = ["Select a node of interest as a focus node to see its relations with the rest of the nodes. Hover upon a node to get more details.",
                         "Scroll down to explore all sections."];
let textsItemOverviewY = [0.3 * heightAttributeOverviewHeader, 0.55 * heightAttributeOverviewHeader];

for (let i = 0; i < textsItemOverview.length; i++) {
    overviewItemHeader.append("text")
                       .attr("x", 0)
                       .attr("y", textsItemOverviewY[i])
                       .attr("class", "annotation-level-2")
                       .style("font-weight", "normal")
                       .text(textsItemOverview[i]);
}

let entropyMap = graphSVG.append("g")
                        .attr("id", "entropy-map-container")
                        .attr("width", widthGraph)
                        .attr("height", 0.25 * heightGraph)
                        .attr("transform", `translate(0, ${0.125 * heightBeeswarm})`);

const entropyMapHeight = 0.25 * heightGraph;
const entropyMapWidth = 0.95 * widthGraph;

graphSVG.append("text")
          .attr("class", "annotation-level-1")
          .attr("x", 0)
          .attr("y", 0.125 * heightBeeswarm)
          .text("Entropy Map");

appendTooltipHint(graphSVG, 100, 0.125 * heightBeeswarm-rQuestionMark, hintsObject["entropyMap"]);

graphSVG.append("text")
        .attr("class", "annotation-level-1")
        .attr("x", 0)
        .attr("y", 0.48 * heightGraph)
        .text("Ego Hamming Graph");

appendTooltipHint(graphSVG, 155, 0.465 * heightGraph, hintsObject["egoHammingGraph"]);

graphSVG.append("text")
        .attr("class", "annotation-level-2")
        .attr("x", 0)
        .attr("y", 0.54 * heightGraph)
        .text("Hamming distance");

let graph = graphSVG.append("g")
                      .attr("width", widthGraph)
                      .attr("height", heightGraph)
                      .attr("transform", `translate(0, ${0.53 * heightGraph})`);


// Find max separation degree and build sections
function buildSections(depth) {
  let lines = [];

  for (let i = 1; i <= depth + 1; i++) {
    graph
      .append("text")
      .attr("class", "annotation-level-2")
      .attr("dy", "0.4em")
      .attr("x", 0)
      .attr("y", (i - 0.5) * heightDegree)
      .text(i - 1);
    let stroke = i == depth + 1 ? "black" : "lightgrey"
    let line = { x1: 0, x2: widthGraph, y: i * heightDegree, stroke: stroke };
    lines.push(line);
  }

  graph
    .selectAll("line")
    .data(lines)
    .enter()
    .append("line")
    .attr("x1", (d) => d.x1)
    .attr("y1", (d) => d.y)
    .attr("x2", (d) => d.x2)
    .attr("y2", (d) => d.y)
    .attr("stroke", (d) => d.stroke)
    .attr("stroke-width", 1);
}


let clickItemNode = function (event, d) {
  event.stopPropagation();
  let itemNodes = d3.selectAll(`.data-item-${d.id}`);
  let currentStroke = itemNodes.style("stroke");
  if (currentStroke === pinkDark) {
    itemNodes.style("stroke", null);
  } else {
    itemNodes.style("stroke", pinkDark).style("opacity", 1);
  }
};


function drawInnerCirclesPerNode(circlesInnerData, nodeGroup) {
  const simulationCircle = d3
    .forceSimulation(circlesInnerData)
    .force("collide", d3.forceCollide(radiusInner + 0.5))
    .force("charge", d3.forceManyBody().strength(0.5))
    .force("x", d3.forceX(0).strength(0.04))
    .force("y", d3.forceY(0).strength(0.04))
    .alphaDecay(0.02)
    .on("tick", () => {
      circlesInnerData.forEach((node) => {
        const dx = node.x;
        const dy = node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = nodeGroup.r - node.r;

        if (dist > maxDist) {
          const angle = Math.atan2(dy, dx);
          node.x = 0;
          node.y = 0;
        }
      });

      nodeGroup
        .selectAll(".inner-circle")
        .data(circlesInnerData)
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .attr("d", arcGenerator);
    });

    const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(d => d.r)
                        .startAngle(0)
                        .endAngle(d => {
                          const completeness = 1 - d.missingness;
                          return completeness * 2 * Math.PI;
                        });

    const opacityScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0.3, 1]);

    nodeGroup
        .selectAll(".inner-circle")
        .data(circlesInnerData)
        .enter()
        .append("path")
        .attr("class", d => `inner-circle data-item-${d.id}`)
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .attr("d", d => arcGenerator(d))
        .style("fill", colorDatapoint)
        .style("fill-opacity", d => opacityScale(d.probability))
        .on("mouseover", mouseoverItemNode)
        .on("mousemove", mousemoveItemNode)
        .on("mouseleave", mouseleaveItemNode)
        .on("click", clickItemNode);
}

function drawInnerCircles(nodesData) {
  let circlesInnerData;
  nodesData.forEach((node) => {
    if (!('grouped_info' in node.node)) {
        circlesInnerData = Array.from({ length: node.node.count }, (_, i) => ({
          x: 0,
          y: 0,
          r: radiusInner,
          missingness: 0,
          probability: 1,
          id: node.node.ids[i]
        }));
    }
    else {
        circlesInnerData = [];
        for (const group of node.node.grouped_info) {
            for (const itemId of group.ids) {
                const circle = {
                    x: 0,
                    y: 0,
                    r: radiusInner,
                    id: itemId,
                    missing_attributes: group.missing_attributes,
                    probability: group.probability.toFixed(2),
                    missingness: group.missingness.toFixed(2)
                };
                circlesInnerData.push(circle);
            }
        }
    }
    const nodeGroup = graph.select(`#node-group-${node.id}`);
    drawInnerCirclesPerNode(circlesInnerData, nodeGroup);
  });
}


function computeRelativeMaxDepth(nodeId) {
  let n = Object.keys(nodes).length - 1;
  let depthMax = 0;
  if (nodeId in edges) {
    let edgeLengths = Object.values(edges[nodeId]).map(
      (edgeArray) => edgeArray.length,
    );
    depthMax = Math.max(...edgeLengths);
  }

  for (let i = 0; i < nodeId; i++) {
    if (i in nodes) {
      depthMax = Math.max(depthMax, edges[i][nodeId].length);
    }
  }
  return depthMax;
}


function calculateOrderInSection(nodeParent, nodesChildren) {
    let nodeDifferences = {};
    for (const nodeChild of nodesChildren) {
        let differences = nodeChild < nodeParent ? edges[nodeChild][nodeParent] : edges[nodeParent][nodeChild];
        let differencesNumerical = differences.map((x) => mapQuestions[x]);
        nodeDifferences[nodeChild] = differencesNumerical;
    }

    nodesChildren.sort((a, b) => {
      const differencesA = nodeDifferences[a];
      const differencesB = nodeDifferences[b];
      for (let i = 0; i < differencesA.length; i++) {
        if (differencesA[i] !== differencesB[i]) {
          return differencesA[i] - differencesB[i];
        }
      }
      return 0;
    });

    let orders = [];
    let order = 0;
    let differencesPrevious = [];
    for (const node of nodesChildren) {
        let differencesCurrent = nodeDifferences[node];
        orders.push(order);
        if (differencesPrevious !== differencesCurrent) {
            differencesPrevious = differencesCurrent;
            order++;
        }
    }

    let nodeOrdering = {};
    let size = orders.length;
    for (let i = 0; i < nodesChildren.length; i++) {
        let nodeChild = nodesChildren[i];
        nodeOrdering[nodeChild] = {"left": orders[size-1] - orders[i], "right": orders[i]};
    }
    return nodeOrdering;
}


function getFirstNonEmptySection(depth) {
    for (let i = 1; i < depth; i++) {
        if (degrees[i].length > 0) {
            return i;
        }
    }
}

function defineQuestionForce(nodeA, nodeB, question, strength) {
    let nodeMin = nodeA.id < nodeB.id ? nodeA.id : nodeB.id;
    let nodeMax = nodeA.id > nodeB.id ? nodeA.id : nodeB.id;
    if (edges[nodeMin][nodeMax].includes(question)) {
        return -200 * strength;
    }
    if (nodeA.degree == nodeB.degree) {
        return 100 * strength;
    }
    return 2000 * strength;
}

function questionForce(question, strength) {
  let nodes;

  function force(alpha) {
    for (let i = 0; i < nodes.length; ++i) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; ++j) {
          const nodeB = nodes[j];

          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          let distSquare = dx * dx  || 1;
          let dist = Math.sqrt(distSquare);
          let restLength = widthGraph;

          let forceStrength = defineQuestionForce(nodeA, nodeB, question, strength);
          let force;

          //needs more work!!!!!
          if (force < 0) {
            force = dist > 0 ? forceStrength * alpha / distSquare : 0.1;
            force = dist > widthGraph / 2 ? 0 : force;
          }
          else {
            force = dist > (nodeA.r + nodeB.r) ? forceStrength * alpha / Math.pow(restLength - dist, 2) : 0;
          }

          const fx = force * dx;
          //const fy = force * dy;

          if (nodeA.degree > nodeB.degree) {
            nodeA.vx -= fx;
          }
          if (nodeB.degree > nodeA.degree) {
            nodeB.vx += fx;
          }
          if (nodeA.degree == nodeB.degree) {
            nodeA.vx -= fx;
            nodeB.vx += fx;
          }
        }
    }
  }

  force.initialize = function(_nodes) {
    nodes = _nodes;
  };

  return force;
}


function applyQuestionBasedForceGraph(question, strength) {
    if (strength == 0) {
        simulationGraph.force(`questionForce-${question}!`, null);
        questionForces.delete(question);
        if (questionForces.size == 0) {
            simulationGraph.force("center",d3.forceX((d) => widthGraph * 0.5).strength(0.1));
            simulationGraph.force("hamming", hammingForce(5))
        }
    }
    else {
        questionForces.add(question);
        simulationGraph.force('center', null);
        simulationGraph.force('hamming', null);
        simulationGraph.force(`questionForce-${question}!`, questionForce(question, strength));
    }
    simulationGraph.alpha(1).restart();
}


function hammingForce(strength = 0.1) {
    let nodes;

    function force(alpha) {
      for (let i = 0; i < nodes.length; ++i) {
        for (let j = i + 1; j < nodes.length; ++j) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];

          if (nodeA.degree !== nodeB.degree) continue;

          const hd = edges[i][j].length;
          //const forceStrength = strength / (hd + 1);
          let forceStrength;

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / distance;
          const ny = dy / distance;

          if (hd === 0){
            forceStrength = distance <= (nodeA.r + nodeB.r + 2) ? 0 : strength * distance;
          }
          else {
            forceStrength = -(hd * strength / distance);
          }

          const fx = nx * forceStrength * alpha;
          const fy = ny * forceStrength * alpha;

          nodeA.vx += fx;
          nodeA.vy += fy;
          nodeB.vx -= fx;
          nodeB.vy -= fy;
        }
      }
    }

    force.initialize = function (_nodes) {
      nodes = _nodes;
    };

    return force;
}

function initializeSimulation(nodesData) {
    //let linksSameGroup = getLinksSameGroup(nodesData, groupings);
    let links = getLinksOneDegreeSeparation(nodesData);
    //let linksHorizontal = formatDataForLinks(links.horizontal, nodesData);
    let linksVertical = formatDataForLinks(links.vertical, nodesData);

    simulationGraph = d3.forceSimulation(nodesData)
    .force("collide", d3.forceCollide((d) => d.r + 1))
    /*.force("charge", d3.forceManyBody().strength((d) => -d.r))*/
    /*.force("center", d3.forceX((d) => widthGraph * 0.5).strength(0.01))*/
    .force("coordinateY", d3.forceY((d) => (d.degree + 0.5) * heightDegree).strength(2))
    .force("hamming", hammingForce(2))
    /*.force(
      "firstSectionForceLeft",
      d3.forceX((d) => d.degree === degreeNonEmpty ? sectionBB.x : null)
        .strength((d) => d.degree === degreeNonEmpty ? nodeOrdering[d.id].left * 0.01 : 0)
    )
    .force(
      "firstSectionForceRight",
      d3.forceX((d) => d.degree === degreeNonEmpty ? widthGraph : null)
        .strength((d) => d.degree === degreeNonEmpty ? nodeOrdering[d.id].right * 0.01 : 0)
    )*/
    /*.force(
      "linkVertical",
      d3.forceLink(links.vertical)
        .distance(radiusMax + 5)
        .strength(0.1),
    )*/
    /*.force(
      "linkHorizontal",
      d3.forceLink(links.horizontal)
        .distance(radiusMax + 5)
        .strength(0.1),
    )*/
    /*.force(
      "linkSameGroup",
      d3.forceLink(linksSameGroup)
        .distance(radiusMax + 0.5)
        .strength(1),
    )*/
    .on("tick", () => {
      nodesData.forEach((node) => {
        let topY = node.degree * heightDegree + sectionBB.y;
        let bottomY = node.degree * heightDegree + sectionBB.y + sectionBB.height;
        node.x = Math.max(
          sectionBB.x,
          Math.min(sectionBB.x + sectionBB.width - node.r, node.x),
        );
        node.y = Math.max(topY, Math.min(bottomY - node.r, node.y));
      });
      graph
          .selectAll(".node-group")
          .data(nodesData)
          .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    })
    .on("end", () => {
      drawInnerCircles(nodesData);
      //drawLinks(linksVertical, colorLinksHD1);
      //drawLinks(linksSameGroup, colorLinksSameGroup);
    });
}

function drawCircles(nodesData, depth, nodeFocusId) {
  nodesData.sort((a, b) => a.id - b.id);
  //let degreeNonEmpty = getFirstNonEmptySection(depth);
  //let nodesChildren = degrees[degreeNonEmpty];
  //let nodeOrdering = calculateOrderInSection(nodeFocusId, nodesChildren);

  const nodeGroups = graph
      .selectAll(".node-group")
      .data(nodesData)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("id", (d) => `node-group-${d.id}`)
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("opacity", 0.95)
      .on("mouseover", mouseoverGroupNode)
      .on("mousemove", mousemoveGroupNode)
      .on("mouseleave", mouseleaveGroupNode)
      .on("click", function (event, d) {
        const nodeId = d.id;
        const depth = computeRelativeMaxDepth(nodeId);
        tooltipGraph.style("opacity", 0);
        graph.selectAll("*").remove();
        constructDegrees(nodeId, depth);
        buildSections(depth);
        drawGraph(parseInt(nodeId), depth);
        drawEntropyMap(entropyMap, entropyMapWidth, entropyMapHeight, nodes, depth, degrees)
  });

  nodeGroups
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d.fill);

  // Forces for nodes
  initializeSimulation(nodesData);
}

function calculateOuterRadius(count, radius) {
  return count === 2 ? 2 * radius : Math.sqrt(count) * radius;
}

// Construct degree map based on HD
function constructDegrees(nodeId, depth) {
  degrees = {};
  degrees[0] = [nodeId];
  let n = Object.keys(nodes).length - 1;

  for (let i = 1; i <= depth; i++) {
    degrees[i] = [];
  }
  for (let i = 0; i < nodeId; i++) {
    if (i in nodes) {
      let degree = edges[i][nodeId].length;
      degrees[degree].push(i);
    }
  }
  for (let i = n; i > nodeId; i--) {
    if (i in nodes) {
      let degree = edges[nodeId][i].length;
      degrees[degree].push(i);
    }
  }
  return degrees;
}

// Draw graph
function drawGraph(nodeId, depth) {
  radiusMin = calculateOuterRadius(numberRespondentsRange[0], radiusInner + 5);
  radiusMax = calculateOuterRadius(numberRespondentsRange[1], radiusInner + 5);

  const radiusScale = d3
    .scaleLinear()
    .domain(numberRespondentsRange)
    .range([radiusMin, radiusMax]);

  /*let nodeFocus = {
    x: 0.5 * widthGraph,
    y: 0.5 * heightDegree,
    r: radiusScale(nodes[nodeId]["count"]),
    fill: colorNode,
    node: nodes[nodeId],
    id: nodeId,
    degree: 0,
  };*/

  let nodesData = [];

  let leftX = sectionBB.x;
  let rightX = sectionBB.x + sectionBB.width;

  for (let i = 0; i <= depth; i++) {
    let topY = i * heightDegree + sectionBB.y;
    let bottomY = i * heightDegree + sectionBB.y + sectionBB.height;

    /*let seed = 12345;
    let pseudoRandomGenerator = d3.randomLcg(seed);
    let randomX = d3.randomUniform.source(pseudoRandomGenerator)(leftX, rightX);
    let randomY = d3.randomUniform.source(pseudoRandomGenerator)(topY, bottomY);*/

    let randomX = widthGraph / 2;
    let randomY = heightDegree / 2;

    let nodesCurrent = degrees[i];
    for (let j = 0; j < nodesCurrent.length; j++) {
      let nodeCurrentId = nodesCurrent[j];
      let rCurrent = radiusScale(nodes[nodeCurrentId]["count"]);
      let circle = {
        //x: nodeCurrentId == nodeId ? 0.5 * widthGraph : randomX(),
        //y: nodeCurrentId == nodeId ? 0.5 * heightDegree : randomY(),
        x: nodeCurrentId == nodeId ? 0.5 * widthGraph : randomX,
        y: nodeCurrentId == nodeId ? 0.5 * heightDegree : randomY,
        r: rCurrent,
        fill: colorNode,
        node: nodes[nodeCurrentId],
        id: nodeCurrentId,
        degree: i,
      };
      nodesData.push(circle);
    }
  }
  if (nodesData.length > 0) {
    drawCircles(nodesData, depth, nodeId);
  }
}

// Extract data and draw data item view
function drawDataItemView() {
  const edgeArrays = Object.values(edges)
    .map((edge) => Object.values(edge))
    .flat();
  const edgeLengths = edgeArrays.map((edgeArray) => edgeArray.length);
  let nodeMaxId = Object.keys(nodes).reduce((a, b) => {
    return nodes[a]["count"] > nodes[b]["count"] ? a : b;
  });
  nodeMaxId = parseInt(nodeMaxId);

  const counts = Object.keys(nodes).map((nodeId) => nodes[nodeId]["count"]);
  const numberRespondentsMin = Math.min(...counts),
    numberRespondentsMax = Math.max(...counts);
  numberRespondentsRange = [numberRespondentsMin, numberRespondentsMax];

  const depth = computeRelativeMaxDepth(nodeMaxId);

  degrees = constructDegrees(nodeMaxId, depth);
  buildSections(depth);
  drawGraph(nodeMaxId, depth);
  drawEntropyMap(entropyMap, entropyMapWidth, entropyMapHeight, nodes, depth, degrees);
}


d3.json("/extract_graph").then((data) => {
  d3.select("#dataset-name").text(data.name);
  nodes = data.nodes;
  edges = data.edges;
  groupings = data.groupings;
  attributesOrder = data.attributesOrder;
  mapQuestions = attributesOrder.reduce((accumulator, value, index) => {
      accumulator[value] = index;
      return accumulator;
    }, {});
  console.log(attributesOrder.length);
  graphSVG.attr("height", (attributesOrder.length + 1) * heightDegree + 0.9 * heightGraph);
  drawDataItemView();
});
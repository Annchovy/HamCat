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
  x: 0.02 * widthGraph,
  y: 0.15 * heightDegree,
  width: 0.96 * widthGraph,
  height: 0,
};

let sectionsY;

// Graph nodes, edges and attribute description
let nodes, edges, groupings;
let attributesOrder, mapQuestions;

// Define node and datapoint radius
let radiusMin, radiusMax, radiusScale;
const radiusInner = 4;
const radiusThreshold = 4;

// Define node and datapoint colors
const colorNode = "#6495ED50",
  colorDatapoint = "#1a237e";

const pinkDark = "rgb(181, 9, 101)";
  
const colorLinksHD1 = "#ADD8E640",
  colorLinksSameGroup = "#FFB6C140";

let binning = 1;

let degrees;

let simulationGraph = undefined;
let questionForces = {};
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
        .attr("y", 0.47 * heightGraph)
        .text("Ego Hamming Network");

appendTooltipHint(graphSVG, 165, 0.458 * heightGraph, hintsObject["egoHammingGraph"]);

graphSVG.append("text")
        .attr("class", "annotation-level-2")
        .attr("x", 0)
        .attr("y", 0.53 * heightGraph)
        .text("Hamming distance bins");

let graph = graphSVG.append("g")
                      .attr("width", widthGraph)
                      .attr("height", heightGraph)
                      .attr("transform", `translate(0, ${0.53 * heightGraph})`);

const zoomX = d3.zoom()
  .scaleExtent([1, 10])
  .translateExtent([[0, 0], [widthGraphSVG, heightGraphSVG]])
  .on("zoom", zoomed);

//graphSVG.call(zoomX);

function zoomed(event) {
  const transform = event.transform;
  graph.attr("transform", `translate(${transform.x}, ${0.53 * heightGraph}) scale(${transform.k}, 1)`);
  handleZoomDetail(transform.k);
}

function adjustSectionHeight(nodesData) {
  if (nodesData.length === 0) {
    sectionBB.height = 0;
    return;
  }

  const counts = nodesData.map((node) => nodes[node]["count"]);
  const numberRespondentsMax = Math.max(...counts);
  let radiusMaxCurrent = radiusScale(numberRespondentsMax);

  let sectionHeight = Math.max(nodesData.length * 2 * radiusMaxCurrent / (0.96 * widthGraph), 1) * 2 * radiusMaxCurrent;

  // additional multiplication by 2 to give the nodes the ability to cluster vertically
  if (nodesData.length > 2) {
    sectionHeight *= 2;
  }
  sectionBB.height = sectionHeight;
  return;
}

// Find max separation degree and build sections
function buildSections(depth) {
  let lines = [];
  let heightCurrent = 0;
  sectionsY = [heightCurrent];

  for (let i = 1; i <= depth + 1; i++) {
    let nodesCurrent = degrees[i-1];
    adjustSectionHeight(nodesCurrent);
    heightCurrent += sectionBB.height + 2 * sectionBB.y;
    sectionsY.push(heightCurrent);
    graph
      .append("text")
      .attr("class", "annotation-level-2")
      .attr("dy", "0.4em")
      .attr("x", 0)
      .attr("y", heightCurrent - (sectionBB.height / 2 + sectionBB.y))
      .text(i - 1);
    let stroke = i == depth + 1 ? "black" : "lightgrey"
    let line = { x1: 0, x2: widthGraph, y: heightCurrent, stroke: stroke };
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

/*
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
*/

/*
function getFirstNonEmptySection(depth) {
    for (let i = 1; i < depth; i++) {
        if (degrees[i].length > 0) {
            return i;
        }
    }
}*/

function defineQuestionForce(nodeA, nodeB, question, strength) {
    let nodeMin = nodeA.id < nodeB.id ? nodeA.id : nodeB.id;
    let nodeMax = nodeA.id > nodeB.id ? nodeA.id : nodeB.id;
    let k;
    let n = Object.keys(nodes).length;

    if (edges[nodeMin][nodeMax].includes(question)) {
        k = 10 / Math.sqrt(n);
        return -k * k * strength;
    }
    k = 1e5 / Math.sqrt(n);
    return strength / k;
}

function questionForce(question, strength) {
  let nodes;

  function force(alpha) {
    for (let i = 0; i < nodes.length; ++i) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; ++j) {
          const nodeB = nodes[j];

          const dx = nodeA.x - nodeB.x;
          const dist = Math.abs(dx) || 1e-6;
          const distSquare = dist * dist;

          let forceStrength = defineQuestionForce(nodeA, nodeB, question, strength);
          let force;

          if (forceStrength < 0) {
            force = forceStrength * alpha / dist;
            console.log(force);
          }
          else {
            force = (dist == (nodeA.r + nodeB.r) * 1.1) ? 0 : forceStrength * alpha * distSquare;
            console.log(force);
          }

          const fx = force * dx / dist;

          nodeA.vx -= fx;
          nodeB.vx += fx;
        }
    }
  }

  force.initialize = function(_nodes) {
    nodes = _nodes;
  };

  return force;
}


function applyQuestionBasedForceGraph(question, strength) {
    if (strength === 0) {
        simulationGraph.force(`questionForce-${question}`, null);
        delete questionForces[`questionForce-${question}`];
        if (Object.keys(questionForces).length === 0) {
            //simulationGraph.force("center",d3.forceX((d) => widthGraph * 0.5).strength(0.1));
            simulationGraph.force("hamming", hammingForce(0.1))
        }
    }
    else {
        let questionForceCurrent = questionForce(question, strength);
        questionForces[`questionForce-${question}`] = questionForceCurrent;
        //simulationGraph.force('center', null);
        simulationGraph.force('hamming', null);
        simulationGraph.force(`questionForce-${question}`, questionForceCurrent);
    }
    simulationGraph.alpha(1).restart();
}


function hammingForce(strength = 0.1) {
    let nodes;
    let baseLength;

    function force(alpha) {
      for (let i = 0; i < nodes.length; ++i) {
        for (let j = i + 1; j < nodes.length; ++j) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];

            if (nodeA.degree !== nodeB.degree) continue;

            const hd = edges[i][j].length;
            const normalizedHD = hd / attributesChecked.size;

            let height = sectionsY[nodeA.degree + 1] - sectionsY[nodeA.degree];

            //let baseLength = Math.sqrt(height * sectionBB.width) / degrees[nodeA.degree].length;
            //const restLength = (baseLength * normalizedHD + nodeA.r + nodeB.r);
            const restLength = baseLength * normalizedHD;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1e-12;
            const nx = dx / distance;
            const ny = dy / distance;

            const displacement = distance - restLength;
            const forceStrength = strength * displacement * alpha;

            const fx = nx * forceStrength;
            const fy = ny * forceStrength;

            nodeA.vx += fx;
            nodeA.vy += fy;
            nodeB.vx -= fx;
            nodeB.vy -= fy;
        }
      }
    }

    force.initialize = function (_nodes) {
      nodes = _nodes;
      baseLength = 0.5 * sectionBB.width;
    };

    return force;
}

function initializeSimulation(nodesData, questionForces) {
    //let linksSameGroup = getLinksSameGroup(nodesData, groupings);
    let links = getLinksOneDegreeSeparation(nodesData);
    //let linksHorizontal = formatDataForLinks(links.horizontal, nodesData);
    let linksVertical = formatDataForLinks(links.vertical, nodesData);
    simulationGraph = d3.forceSimulation(nodesData);

    if (Object.keys(questionForces).length > 0) {
        for (const key of Object.keys(questionForces)) {
            simulationGraph.force(key, questionForces[key]);
        }
    }

    simulationGraph.force("collide", d3.forceCollide((d) => d.r + 1))
    //.force("charge", d3.forceManyBody().strength((d) => -d.r))
    /*.force("center", d3.forceX((d) => widthGraph * 0.5).strength(0.01))*/
    //.force("coordinateY", d3.forceY((d) => (sectionsY[d.degree] + (sectionsY[d.degree + 1] - sectionsY[d.degree]) / 2)).strength(1))
    .force("hamming", hammingForce(0.1))
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
        let topY = sectionsY[node.degree] + sectionBB.y;
        let bottomY = sectionsY[node.degree + 1] - sectionBB.y;
        let leftX = sectionBB.x;
        let rightX = sectionBB.x + sectionBB.width;
        node.x = Math.max(leftX + node.r, Math.min(rightX - node.r, node.x));
        node.y = Math.max(topY + node.r, Math.min(bottomY - node.r, node.y));
      });
      graph
          .selectAll(".node-group")
          .data(nodesData)
          .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    })
    /*.on("end", () => {
      //drawLinks(linksVertical, colorLinksHD1);
      //drawLinks(linksSameGroup, colorLinksSameGroup);
    });*/
}


function drawCircles(nodesData, depth, nodeFocusId) {
    nodesData.sort((a, b) => a.id - b.id);
    //let degreeNonEmpty = getFirstNonEmptySection(depth);
    //let nodesChildren = degrees[degreeNonEmpty];
    //let nodeOrdering = calculateOrderInSection(nodeFocusId, nodesChildren);

    initializeSimulation(nodesData, questionForces);

    simulationGraph.on("end", () => {
        let nodesLarge = nodesData.filter(d => d.r > radiusThreshold);
        const nodesSmall = nodesData.filter(d => d.r <= radiusThreshold);

        const nodeGroups = graph
          .selectAll(".node-group")
          .data(nodesLarge)
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

        drawInnerCircles(nodesLarge);
    });
}


let smallNodesVisible = false;

function handleZoomDetail(scale) {
  const zoomRevealThreshold = 2.5;

  if (scale > zoomRevealThreshold && !smallNodesVisible) {
    drawVisibleNodes(smallNodes);
    smallNodesVisible = true;
  }

  if (scale <= zoomRevealThreshold && smallNodesVisible) {
    graph.selectAll(".small-node-group").remove();
    smallNodesVisible = false;
  }
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
      let degree = Math.floor(edges[i][nodeId].length / binning);
      degrees[degree].push(i);
    }
  }
  for (let i = n; i > nodeId; i--) {
    if (i in nodes) {
      let degree = Math.floor(edges[nodeId][i].length / binning);
      degrees[degree].push(i);
    }
  }
  return degrees;
}

// Draw graph
function drawGraph(nodeId, depth) {

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

  //let leftX = sectionBB.x;
  //let rightX = sectionBB.x + sectionBB.width;

  for (let i = 0; i <= depth; i++) {
    //let topY = heightCurrent + sectionBB.y;
    //let bottomY = heightCurrent + sectionBB.y + sectionBB.height;

    /*let seed = 12345;
    let pseudoRandomGenerator = d3.randomLcg(seed);
    let randomX = d3.randomUniform.source(pseudoRandomGenerator)(leftX, rightX);
    let randomY = d3.randomUniform.source(pseudoRandomGenerator)(topY, bottomY);*/

    let nodesCurrent = degrees[i];
    adjustSectionHeight(nodesCurrent);

    let randomX = widthGraph / 2;
    let randomY = sectionBB.height / 2 + sectionBB.y;

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
  graph.selectAll("*").remove();
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

  radiusMin = calculateOuterRadius(numberRespondentsRange[0], radiusInner + 5);
  radiusMax = calculateOuterRadius(numberRespondentsRange[1], radiusInner + 5);
  radiusScale = d3
    .scaleLinear()
    .domain(numberRespondentsRange)
    .range([radiusMin, radiusMax]);

  const depthRaw = computeRelativeMaxDepth(nodeMaxId);
  const depth = Math.floor(depthRaw / binning);

  degrees = constructDegrees(nodeMaxId, depth);
  buildSections(depth);
  drawGraph(nodeMaxId, depth);
  drawEntropyMap(entropyMap, entropyMapWidth, entropyMapHeight, nodes, depth, degrees);
  graphSVG.attr("height", sectionsY[sectionsY.length - 1] + 0.9 * heightBeeswarm);
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
  drawDataItemView();
  buildSliderGraph(attributesChecked.size + 1);
});
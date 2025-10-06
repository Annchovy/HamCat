"use strict";

// Define graph's canvas
let element = d3.select("#hamming-graph").node();
let boundingRect = element.getBoundingClientRect();
let widthGraphSVG = boundingRect.width;
let heightGraphSVG = boundingRect.height;

let widthGraph = 0.6 * widthGraphSVG;
let heightGraph = 0.6 * heightGraphSVG;
let heightSection = 0.2 * heightGraph;

let sectionBB = {
  x: 0.05 * widthGraph,
  y: 0.15 * heightSection,
  width: 0.9 * widthGraph,
  height: 0.7 * heightSection,
};
let sectionHeights = [];

// Graph nodes, edges and attribute description
let nodes, edges, groupings;
let attributesOrder, mapQuestions;

// Define node and datapoint radius
let radiusMin, radiusMax;
let radiusInner = 5;

// Define node and datapoint colors
const colorNode = "#6495ED",
  colorDatapoint = "#5e3c99";
  
const colorLinksHD1 = "#ADD8E640",
  colorLinksSameGroup = "#FFB6C140";

let nodesRemoved = {};
let degrees;

let simulationGraph;
let numberRespondentsRange;

let graphCanvas = d3
  .select("#hamming-graph")
  .append("svg")
  .attr("width", widthGraphSVG)
  .attr("height", 10 * heightGraphSVG);

graphCanvas
  .append("text")
  .attr("dx", 0.4 * widthGraphSVG)
  .attr("dy", "2em")
  .text("Data Items")
  .attr("class", "view-title");

let graph = graphCanvas
  .append("g")
  .attr("width", widthGraph)
  .attr("height", heightGraph)
  .attr(
    "transform",
    "translate(" + 0.1 * widthGraphSVG + "," + 0.1 * heightGraphSVG + ")",
  );

let tooltip = d3
  .select("#hamming-graph")
  .append("div")
  .style("position", "absolute")
  .style("opacity", 0)
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px");

let mouseover = function (event, d) {
  tooltip.style("opacity", 1);
  d3.select(this).style("stroke", "black").style("opacity", 1);
};

let mousemove = function (event, d) {
  let attributes = ["count", "ids", ...attributesOrder];
  let nodeAttributes = attributes.map(
    (key) => key + ": " + d.node[key],
  );
  let tooltipText = nodeAttributes.join("<br>");
  tooltip
    .html(tooltipText)
    .style("left", event.pageX + 30 + "px")
    .style("top", event.pageY + "px");
};

let mouseleave = function (event, d) {
  tooltip.style("opacity", 0);
  d3.select(this).style("stroke", "none").style("opacity", 0.8);
};

// find max separation degree and build sections
function buildSections(depth) {
  let lines = [];
  let heightAccumulated = sectionBB.y;

  let sectionHeightScale = d3
    .scaleLinear()
    .domain([0, 10])
    .range([0.1 * heightSection, heightSection]);

  for (let i = 1; i <= depth + 1; i++) {
    let heightCurrent = sectionHeightScale(10);

    graph
      .append("text")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("x", sectionBB.x - 0.1 * widthGraph)
      .attr("y", heightAccumulated + heightCurrent / 2)
      .text(i - 1);

    heightAccumulated += heightCurrent;
    let line = { x1: 0, x2: widthGraph, y: heightAccumulated - sectionBB.y };
    lines.push(line);
    sectionHeights.push(heightCurrent);
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
    .attr("stroke", "lightgrey")
    .attr("stroke-width", 1);
}


function drawInnerCirclesPerNode(circlesInnerData, nodeFocus) {
  const simulationCircle = d3
    .forceSimulation(circlesInnerData)
    .force("collide", d3.forceCollide(radiusInner + 0.5))
    .force("charge", d3.forceManyBody().strength(0.5))
    .force("x", d3.forceX(nodeFocus.x).strength(0.02))
    .force("y", d3.forceY(nodeFocus.y).strength(0.02))
    .alphaDecay(0.02)
    .on("tick", () => {
      circlesInnerData.forEach((node) => {
        const dx = node.x - nodeFocus.x;
        const dy = node.y - nodeFocus.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = nodeFocus.r - node.r;

        if (dist > maxDist) {
          const angle = Math.atan2(dy, dx);
          node.x = nodeFocus.x;
          node.y = nodeFocus.y;
        }
      });

      graph
        .selectAll(".inner-circle-" + nodeFocus.id)
        .data(circlesInnerData)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
    });

  graph
    .selectAll(".inner-circle-" + nodeFocus.id)
    .data(circlesInnerData)
    .enter()
    .append("circle")
    .attr("class", "inner-circle-" + nodeFocus.id)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .style("fill", colorDatapoint);
}


function drawInnerCircles(nodesData) {
  for (let i = 0; i < nodesData.length; i++) {
    let node = nodesData[i];
    let circlesInnerData = [];
    for (let n = 0; n < node.node.count; n++) {
      let circle = { x: node.x, y: node.y, r: radiusInner };
      circlesInnerData.push(circle);
    }
    drawInnerCirclesPerNode(circlesInnerData, node);
  }
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

function defineQuestionForce(nodeA, nodeB, question) {
    let nodeMin = nodeA.id < nodeB.id ? nodeA.id : nodeB.id;
    let nodeMax = nodeA.id > nodeB.id ? nodeA.id : nodeB.id;
    if (edges[nodeMin][nodeMax].includes(question)) {
        return 10000
    }
    return -10000
}

function questionForce(question) {
  let nodes;

  function force(alpha) {
    for (let i = 0; i < nodes.length; ++i) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; ++j) {
          const nodeB = nodes[j];

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          let distSq = dx * dx + dy * dy || 1;

          let forceStrength = defineQuestionForce(nodeA, nodeB, question);

          const force = forceStrength * alpha / distSq;

          const fx = force * dx;
          const fy = force * dy;

          nodeA.vx -= fx;
          //nodeA.vy -= fy;
          nodeB.vx += fx;
          //nodeB.vy += fy;
        }
    }
  }

  force.initialize = function(_nodes) {
    nodes = _nodes;
  };

  return force;
}


function applyQuestionBasedForceGraph(question) {
    simulationGraph.force("questionForce", questionForce(question));
    simulationGraph.alpha(0.5).restart();
}


function drawCircles(nodesData, depth, nodeFocusId) {
  nodesData.sort((a, b) => a.id - b.id);
  let degreeNonEmpty = getFirstNonEmptySection(depth);
  let nodesChildren = degrees[degreeNonEmpty];
  let nodeOrdering = calculateOrderInSection(nodeFocusId, nodesChildren);

  let linksSameGroup = getLinksSameGroup(nodesData, groupings);
  let links = getLinksOneDegreeSeparation(nodesData);
  //let linksHorizontal = formatDataForLinks(links.horizontal, nodesData);
  let linksVertical = formatDataForLinks(links.vertical, nodesData);

  // Forces for nodes
  simulationGraph = d3.forceSimulation(nodesData)
    .force(
      "collide",
      d3.forceCollide((d) => d.r + 0.5),
    )
    .force(
      "charge",
      d3.forceManyBody().strength((d) => -d.r),
    )
    .force(
       "hierarchyCoordinateY",
       d3.forceY((d) => (d.degree + 0.5) * heightSection).strength(5),
    )
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
    .force(
      "linkSameGroup",
      d3.forceLink(linksSameGroup)
        .distance(radiusMax + 0.5)
        .strength(1),
    )
    .on("tick", () => {
      nodesData.forEach((node) => {
        let topY = node.degree * heightSection + sectionBB.y;
        let bottomY = node.degree * heightSection + sectionBB.y + sectionBB.height;
        node.x = Math.max(
          sectionBB.x,
          Math.min(sectionBB.x + sectionBB.width - node.r, node.x),
        );
        node.y = Math.max(topY, Math.min(bottomY - node.r, node.y));
      });
      graph
        .selectAll("circle")
        .data(nodesData)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
    })
    .on("end", () => {
      drawInnerCircles(nodesData);
      //drawLinks(linksVertical, colorLinksHD1);
      //drawLinks(linksSameGroup, colorLinksSameGroup);
    });

  graph
    .selectAll("circle")
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .attr("fill", (d) => d.fill)
    .style("opacity", 0.8)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
    .on("click", function (event, d) {
      const nodeId = d.id;
      const depth = computeRelativeMaxDepth(nodeId);
      tooltip.style("opacity", 0);
      graph.selectAll("*").remove();
      constructDegrees(nodeId, depth);
      buildSections(depth);
      drawGraph(parseInt(nodeId), depth);
      d3.select(this).attr("fill", "red");
    });
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
    y: 0.5 * heightSection,
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
    let topY = i * heightSection + sectionBB.y;
    let bottomY = i * heightSection + sectionBB.y + sectionBB.height;

    let randomX = d3.randomUniform(leftX, rightX);
    let randomY = d3.randomUniform(topY, bottomY);

    let nodesCurrent = degrees[i];
    for (let j = 0; j < nodesCurrent.length; j++) {
      let nodeCurrentId = nodesCurrent[j];
      let rCurrent = radiusScale(nodes[nodeCurrentId]["count"]);
      let circle = {
        x: nodeCurrentId == nodeId ? 0.5 * widthGraph : randomX(),
        y: nodeCurrentId == nodeId ? 0.5 * heightSection : randomY(),
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

  constructDegrees(nodeMaxId, depth);
  buildSections(depth);
  drawGraph(nodeMaxId, depth);
}

d3.json("/extract_graph").then((data) => {
  nodes = data.nodes;
  edges = data.edges;
  groupings = data.groupings;
  attributesOrder = data.attributesOrder;
  mapQuestions = attributesOrder.reduce((accumulator, value, index) => {
      accumulator[value] = index;
      return accumulator;
    }, {});
  drawDataItemView();
});
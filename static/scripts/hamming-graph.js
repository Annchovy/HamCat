var element = d3.select('#hamming-graph').node();
var boundingRect = element.getBoundingClientRect();

var widthGraphSVG = boundingRect.width;
var heightGraphSVG = boundingRect.height;

var widthGraph = 0.6 * widthGraphSVG;
var heightGraph = 0.6 * heightGraphSVG;
var heightSection = 0.2 * heightGraph;

var sectionBB = {x: 0.05 * widthGraph,
                 y: 0.15 * heightSection,
                 width: 0.9 * widthGraph,
                 height: 0.7 * heightSection};

const radiusMin = 10, radiusMax = 20, radiusInner = 4;

const colorOuter = "#6495ED", colorInner = "#5e3c99";

let graph = d3.select("#hamming-graph")
              .append("svg")
              .attr("width", widthGraphSVG)
              .attr("height", 10 * heightGraphSVG)
              .append("g")
              .attr("width", widthGraph)
              .attr("height", heightGraph)
              .attr("transform",
                    "translate(" + 0.1 * widthGraphSVG + "," + 0.1 * heightGraphSVG + ")");

let tooltip = d3.select("#hamming-graph")
    .append("div")
    .style("position", "absolute")
    .style("opacity", 0)
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px");

let mouseover = function(event, d) {
    tooltip
      .style("opacity", 1);
    d3.select(this)
      .style("stroke", "black")
      .style("opacity", 1)
  };

let mousemove = function(event, d) {
    var nodeAttributes = Object.keys(d.node).map((key) => key + ": " + d.node[key]);
    var tooltipText = nodeAttributes.join("<br>");
    tooltip
      .html(tooltipText)
      .style("left", (event.pageX + 30) + "px")
      .style("top", event.pageY + "px");
  };

let mouseleave = function(event, d) {
    tooltip.style("opacity", 0);
    d3.select(this)
      .style("stroke", "none")
      .style("opacity", 0.8)
  };


// find max separation degree and build sections
function buildSections(nodes, edges, depthMax) {
    var sections = [];
    var lines = [];

    for (let i = 1; i <= depthMax + 1; i++) {
        var section = graph.append("g")
                        .attr("id", "section" + (i - 1))
                        .attr("width", sectionBB.width)
                        .attr("height", sectionBB.height)
                        .attr("transform",
                              "translate(" + sectionBB.x + "," + ((i - 1) * heightSection + sectionBB.y) + ")");

        sections.push(section);
        line = {x1: 0, x2: widthGraph, y: i * heightSection};
        lines.push(line);
    }

    graph.selectAll("line")
          .data(lines)
          .enter()
          .append("line")
          .attr("x1", d => d.x1)
          .attr("y1", d => d.y)
          .attr("x2", d => d.x2)
          .attr("y2", d => d.y)
          .attr("stroke", "lightgrey")
          .attr("stroke-width", 1);
}


// draw graph
function getNodesOneDegreeSeparation(nodes, edges) {
    var edgesCurrent = [];
    for (let i = 0; i < nodes.length; i++) {
        var source = nodes[i].id;
        for (let j = i + 1; j < nodes.length; j++) {
            var target = nodes[j].id;
            if (edges[source][target] == 1) {
                edgesCurrent.push({'source': i, 'target': j});
            }
        }
    }
    return edgesCurrent;
}


function drawInnerCirclesPerNode(section, circlesInnerData, nodeFocus) {
    const simulationCircle = d3.forceSimulation(circlesInnerData)
    .force("collide", d3.forceCollide(radiusInner + 0.5))
    .force("charge", d3.forceManyBody().strength(0.5))
    .force("x", d3.forceX(nodeFocus.x).strength(0.02))
    .force("y", d3.forceY(nodeFocus.y).strength(0.02))
    .alphaDecay(0.02)
    .on("tick", () => {
        circlesInnerData.forEach(node => {
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

        section.selectAll(".inner-circle-" + nodeFocus.id)
            .data(circlesInnerData)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    section.selectAll(".inner-circle-" + nodeFocus.id)
        .data(circlesInnerData)
        .enter()
        .append("circle")
        .attr("class", "inner-circle-" + nodeFocus.id)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .style("fill", colorInner);
}


function drawInnerCircles(section, nodesData) {
    for (let i = 0; i < nodesData.length; i++) {
        var node = nodesData[i];
        var circlesInnerData = [];
        for (let n = 0; n < node.node.count; n++) {
            var circle = { x: node.x, y: node.y, r: radiusInner };
            circlesInnerData.push(circle);
        }
        drawInnerCirclesPerNode(section, circlesInnerData, node)
    }
}


function drawCircles(degree, nodesData, edges) {
    var section = d3.select("#section" + degree);
    nodesData.sort((a, b) => a.id - b.id)
    var nodesOneDegreeSeparation = getNodesOneDegreeSeparation(nodesData, edges);
    d3.forceSimulation(nodesData)
    .force("charge", d3.forceManyBody().strength(d => -d.r / 2))
    .force("link", d3.forceLink(nodesOneDegreeSeparation).distance(radiusMax + 5))
    .on("tick", () => {
            nodesData.forEach(node => {
                node.x = Math.max(0, Math.min(sectionBB.width - node.r, node.x));
                node.y = Math.max(0, Math.min(sectionBB.height - node.r, node.y));
            });
            section.selectAll("circle")
                .data(nodesData)
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
    })
    .on("end", () => {
        drawInnerCircles(section, nodesData, degree);
    });

     section.selectAll("circle")
            .data(nodesData)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .attr("fill", d => d.fill)
            .style("opacity", 0.8)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
}

function drawGraph(nodeId, nodes, edges, depthMax, respondentsRange) {
    var n = Object.keys(nodes).length;
    var degrees = {};

    const radiusScale = d3.scaleLinear()
       .domain(respondentsRange)
       .range([radiusMin, radiusMax]);

    for (let i = 1; i <= depthMax; i++) {
        degrees[i] = [];
    }

    for (let i = 0; i < nodeId; i++) {
        var degree = edges[i][nodeId];
        degrees[degree].push(i);
    }

    for (let i = n-1; i > nodeId; i--) {
        var degree = edges[nodeId][i];
        degrees[degree].push(i);
    }

    var nodeFocus = { x: 0.5 * widthGraph,
                      y: 0.5 * heightSection,
                      r: radiusMax,
                      fill: colorOuter,
                      node: nodes[nodeId],
                      id: nodeId };

    drawCircles(0, [nodeFocus], edges);

    const randomX = d3.randomUniform(0, widthGraph);
    const randomY = d3.randomUniform(0, heightSection);

    for (let i = 1; i <= depthMax; i++) {
        var nodesCurrent = degrees[i];
        var nodesData = [];
        for (let j = 0; j < nodesCurrent.length; j++) {
            var nodeCurrentId = nodesCurrent[j];
            var rCurrent = radiusScale(nodes[nodeCurrentId]['count']);

            var circle = { x: randomX(),
                           y: randomY(),
                           r: rCurrent,
                           fill: colorOuter,
                           node: nodes[nodeCurrentId],
                           id: nodeCurrentId };

            nodesData.push(circle);
        }
        if (nodesData.length > 0) {
            drawCircles(i, nodesData, edges);
        }
    }
};

// extract data and draw graph
d3.json("/extract_graph").then(data => {
    var nodes = data.nodes;
    var edges = data.edges;

    const edgeLengths = Object.values(edges).map(edge => Object.values(edge));
    const depthMax = Math.max(...edgeLengths.flat());
    const nodeMaxId = Object.keys(nodes).reduce((a, b) => {
        return (nodes[a]['count'] > nodes[b]['count']) ? a : b
    });

    const counts = Object.keys(nodes).map(nodeId => nodes[nodeId]['count']);
    const countMin = Math.min(...counts), countMax = Math.max(...counts);
    buildSections(nodes, edges, depthMax);

    drawGraph(parseInt(nodeMaxId), nodes, edges, depthMax, [countMin, countMax]);
});



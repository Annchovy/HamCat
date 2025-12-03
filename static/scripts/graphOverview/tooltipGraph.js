const pinkLight = "#c74e8f";

let tooltipGraph = d3
  .select("#hamming-graph")
  .append("div")
  .attr("class", "tooltip");

let mouseoverGroupNode = function (event, d) {
  event.stopPropagation();
  tooltipGraph.style("opacity", 1);
  d3.select(this).style("stroke", "black").style("opacity", 1);
};

let mousemoveGroupNode = function (event, d) {
  event.stopPropagation();
  let attributes = ["count", ...attributesOrder].filter((key) => key in d.node);
  let nodeAttributes = attributes.map(
    //(key) => (key in questions ? questions[key].text : key) + ": " + d.node[key],
    (key) => key + ": " + d.node[key],
  );
  let tooltipText = nodeAttributes.join("<br>");

  const tooltipHeight = tooltipGraph.node().offsetHeight || 0;
  const tooltipWidth = tooltipGraph.node().offsetWidth || 0;
  let left = event.clientX - tooltipWidth - 10;
  let top = event.clientY - tooltipHeight - 10;

  tooltipGraph
    .html(tooltipText)
    .style("left", `${left}px`)
    .style("top", `${top}px`);
};

let mouseleaveGroupNode = function (event, d) {
    tooltipGraph.style("opacity", 0);
    d3.select(this).style("stroke", null).style("opacity", 0.95);
};

let mouseoverItemNode = function (event, d) {
  event.stopPropagation();
  tooltipGraph.style("opacity", 1);
  let itemNodes = d3.selectAll(`.data-item-${d.id}`);
  let currentStroke = itemNodes.style("stroke");
  if (currentStroke !== pinkDark) {
    itemNodes.style("stroke", pinkLight).style("opacity", 1);
  }
};

let mousemoveItemNode = function (event, d) {
  event.stopPropagation();
  let attributes = ["id", "missing_attributes", "missingness", "probability"];
  let nodeAttributes = [];
  for (const attribute of attributes) {
    if (attribute in d) {
        nodeAttributes.push(attribute + ": " + d[attribute])
    }
  }

  let tooltipText = nodeAttributes.join("<br>");

  const tooltipHeight = tooltipGraph.node().offsetHeight || 0;
  const tooltipWidth = tooltipGraph.node().offsetWidth || 0;
  let left = event.clientX - tooltipWidth - 10;
  let top = event.clientY - tooltipHeight - 10;

  tooltipGraph
    .html(tooltipText)
    .style("left", `${left}px`)
    .style("top", `${top}px`);
};

let mouseleaveItemNode = function (event, d) {
    tooltipGraph.style("opacity", 0);
    let itemNodes = d3.selectAll(`.data-item-${d.id}`);
    let currentStroke = itemNodes.style("stroke");
    if (currentStroke !== pinkDark) {
        itemNodes.style("stroke", null).style("opacity", 0.95);
    }
};
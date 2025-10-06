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
  d3.select(this).style("stroke", "none").style("opacity", 0.95);
};
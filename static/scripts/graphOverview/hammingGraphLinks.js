function getLinksOneDegreeSeparation(nodes) {
  let links = { vertical: [], horizontal: [] };
  for (let i = 0; i < nodes.length; i++) {
    let source = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      let target = nodes[j];
      if (edges[source.id][target.id].length == 1) {
        if (source.degree === target.degree) {
          links.horizontal.push({ source: i, target: j });
        } else {
          links.vertical.push({ source: i, target: j });
        }
      }
    }
  }
  return links;
}


function getLinksSameGroup(nodes, groupings) {
  let links = [];
  for (let i = 0; i < nodes.length; i++) {
    let source = nodes[i].id;
    for (let j = i + 1; j < nodes.length; j++) {
      let target = nodes[j].id;
      if (
        nodes[i].degree === nodes[j].degree &&
        source in groupings &&
        target in groupings[source]
      ) {
        links.push({ source: i, target: j });
      }
    }
  }
  return links;
}


function formatDataForLinks(links, nodesData) {
  let linksData = [];
  for (const link of links) {
    const sourceData = nodesData[link.source];
    const targetData = nodesData[link.target];
    const linkNew = { source: sourceData, target: targetData };
    linksData.push(linkNew);
  }
  return linksData;
}


function drawLinks(links, color) {
  let circles = [];
  let lines = [];
  for (const link of links) {
    const source = link.source;
    const target = link.target;

    circles.push({ x: source.x, y: source.y, r: 1.5 * source.r });
    circles.push({ x: target.x, y: target.y, r: 1.5 * target.r });
    lines.push({ x1: source.x, x2: target.x, y1: source.y, y2: target.y });
  }

  graph
    .selectAll(".linked-circle")
    .data(circles)
    .enter()
    .append("circle")
    .attr("class", ".linked-circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .style("fill", color)
    .lower();

  graph
    .selectAll(".links")
    .data(lines)
    .enter()
    .append("line")
    .attr("class", ".links")
    .attr("x1", (d) => d.x1)
    .attr("x2", (d) => d.x2)
    .attr("y1", (d) => d.y1)
    .attr("y2", (d) => d.y2)
    .attr("stroke-width", 5)
    .style("stroke", color)
    .lower();
}
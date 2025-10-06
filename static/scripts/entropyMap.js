let elementEntropyMap = d3.select("#entropy-map-container").node();
let boundingRectEntropyMap = elementEntropyMap.getBoundingClientRect();
let entropyMapHeight = 0.8 * boundingRectEntropyMap.height;
let entropyMapSVG;

function computeEntropy(nodeIds) {
  let attributeValueCounts = {};

  for (const attr of attributesOrder) {
    attributeValueCounts[attr] = {};
    for (const nodeId of nodeIds) {
      const val = nodes[nodeId][attr];
      if (!(val in attributeValueCounts[attr])) {
        attributeValueCounts[attr][val] = 0;
      }
      attributeValueCounts[attr][val] += 1;
    }
  }

  let totalEntropy = 0;
  const totalNodes = nodeIds.length;

  for (const attr in attributeValueCounts) {
    let entropyAttr = 0;
    const counts = Object.values(attributeValueCounts[attr]);
    for (const count of counts) {
      const p = count / totalNodes;
      entropyAttr += -p * Math.log2(p);
    }
    totalEntropy += entropyAttr;
  }

  return totalEntropy / attributesOrder.length;
}


function drawEntropyMap(depth) {
  d3.select("#entropy-map-container").selectAll("*").remove();
  let translateX = 0.1 * boundingRectEntropyMap.width;
  let translateY = 0.1 * boundingRectEntropyMap.height;
  entropyMapSVG = d3.select("#entropy-map-container")
                    .append("svg")
                    .attr("width", boundingRectEntropyMap.width)
                    .attr("height", 0.85 * boundingRectEntropyMap.height)
                    .attr(
                        "transform",
                        "translate(" + translateX + "," + translateY + ")",
                      );

  entropyMapSVG.append("text")
               .attr("x", 0)
               .attr("y", 0.02 * boundingRectEntropyMap.height)
               .attr("class", "visualization-label")
               .text("Entropy Map");

  const sectionHeight = entropyMapHeight / (depth + 1);

  const entropyColor = d3.scaleLinear()
    .domain([0, 1])
    .range(["#ffffff", "#00008B"]);

  const maxInnerCircles = d3.max(Object.keys(degrees), d =>
    degrees[d].reduce((sum, nodeId) => sum + nodes[nodeId].count, 0)
  );

  const barScale = d3.scaleLinear()
                    .domain([0, maxInnerCircles])
                    .range([0, 0.5 * boundingRectEntropyMap.width]);

  const sectionX = 0.11 * boundingRectEntropyMap.width;

  for (let i = 0; i <= depth; i++) {
    const sectionY = i * sectionHeight + 0.05 * boundingRectEntropyMap.height;

    const nodeIds = degrees[i];
    const totalCount = nodeIds.reduce((sum, nodeId) => sum + nodes[nodeId].count, 0);

    const entropy = computeEntropy(nodeIds);
    const color = entropyColor(entropy);

    const group = entropyMapSVG.append("g")
      .attr("transform", `translate(${sectionX}, ${sectionY})`);

    group
      .append("text")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("x", -0.07 * boundingRectEntropyMap.width)
      .attr("y", sectionHeight / 2)
      .attr("class", "entropy-section-label")
      .text(i);

    group.append("rect")
      .attr("width", 0.15 * boundingRectEntropyMap.width)
      .attr("height", sectionHeight)
      .attr("class", "entropy-section")
      .attr("fill", color)
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    group.append("rect")
      .attr("x", 0.15 * boundingRectEntropyMap.width)
      .attr("y", 0)
      .attr("height", sectionHeight)
      .attr("width", barScale(totalCount))
      .attr("fill", "lightgrey");
  }

  const scrollContainer = document.getElementById("hamming-graph");
  const contentHeight = scrollContainer.scrollHeight;

  const visibleHeight = scrollContainer.clientHeight; // -0.1 * height - header height
  const proportion = visibleHeight / contentHeight;

  entropyMapSVG.append("rect")
    .attr("class", "entropy-scroll-marker")
    .attr("x", sectionX)
    .attr("y",  0.05 * boundingRectEntropyMap.height)
    .attr("width", 0.15 * boundingRectEntropyMap.width)
    .attr("height", proportion * sectionHeight * (depth + 1))
    .attr("stroke", "#A8DCAB")
    .attr("stroke-width", 4)
    .attr("fill", "none");
}


function setupScrollSync(depth) {
  const scrollContainer = document.getElementById("hamming-graph");
  const entropyMarker = d3.select(".entropy-scroll-marker");

  if (!entropyMarker.empty()) {
    scrollContainer.addEventListener("scroll", () => {
      const contentHeight = scrollContainer.scrollHeight;
      const visibleHeight = scrollContainer.clientHeight;
      const scrollTop = scrollContainer.scrollTop;

      const proportion = scrollTop / contentHeight;

      entropyMarker.attr("y", 0.05 * boundingRectEntropyMap.height + proportion * entropyMapHeight);
    });
  }
}


document.getElementById("hamming-graph").addEventListener("wheel", function(e) {
  this.scrollTop += e.deltaY;
  e.preventDefault();
}, { passive: false });

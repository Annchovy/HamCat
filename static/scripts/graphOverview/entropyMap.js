function computeEntropy(nodeIds) {
  let attributeValueCounts = {};

  for (const attr of attributesOrder) {
    attributeValueCounts[attr] = {};
    for (const nodeId of nodeIds) {
      const val = questions[attr]['options_categories'][nodes[nodeId][attr]];
      if (!(val in attributeValueCounts[attr])) {
        attributeValueCounts[attr][val] = 0;
      }
      attributeValueCounts[attr][val] += nodes[nodeId]['count'];
    }
  }
  let totalEntropy = 0;
  const totalNodes = nodeIds.length;
  const totalItems = nodeIds.reduce((accumulator, nodeId) => { return accumulator + nodes[nodeId]['count']}, 0)

  for (const attr in attributeValueCounts) {
    let entropyAttr = 0;
    const counts = Object.values(attributeValueCounts[attr]);
    for (const count of counts) {
      const p = count / totalItems;
      entropyAttr += -p * Math.log2(p);
    }
    totalEntropy += entropyAttr;
  }
  return totalEntropy / attributesOrder.length;
}

function drawEntropyMap(entropyMap, entropyMapWidth, entropyMapHeight, nodes, depth, degrees) {
    d3.select("#entropy-map-container").selectAll("*").remove();

    const sectionWidth = entropyMapWidth / (depth + 1);
    const maxInnerCircles = d3.max(Object.keys(degrees), d =>
        degrees[d].reduce((sum, nodeId) => sum + nodes[nodeId].count, 0)
    );

    let entropyMapBarchartWidth = 0.95 * entropyMapWidth;
    let entropyMapBarchartHeight = 0.4 * entropyMapHeight;
    let entropyMapBarchartX = entropyMapWidth - entropyMapBarchartWidth;
    let entropyMapBarchartY = 0.6 * entropyMapHeight;
    let entropyMapBarchart = entropyMap.append("g")
                                          .attr("width", entropyMapBarchartWidth)
                                          .attr("height", entropyMapBarchartHeight)
                                          .attr("transform",
                                          `translate(${entropyMapBarchartX}, ${entropyMapBarchartY})`);
    const barScale = d3.scaleLinear()
                         .domain([0, maxInnerCircles])
                         .range([0, 0.5 * entropyMapHeight]);

    let entropies = {};

    for (let i = 0; i <= depth; i++) {
        const nodeIds = degrees[i];
        const entropy = computeEntropy(nodeIds);
        entropies[i] = entropy;
    }

    const maxEntropy = Math.max(...Object.values(entropies));
    const entropyColor = maxEntropy === 0 ? () => "#ffffff" : d3.scaleLinear().domain([0, maxEntropy]).range(["#ffffff", "#00008b"]);

    for (let i = 0; i <= depth; i++) {
        const sectionX = i * sectionWidth;

        const nodeIds = degrees[i];
        const totalCount = nodeIds.reduce((sum, nodeId) => sum + nodes[nodeId].count, 0);

        const entropy = entropies[i];
        const color = entropyColor(entropy);

        const group = entropyMapBarchart.append("g").attr("transform", `translate(${sectionX}, 0)`);

        group.append("rect")
              .attr("x", 0)
              .attr("y",  -barScale(totalCount))
              .attr("height", barScale(totalCount))
              .attr("class", "entropy-section")
              .attr("width", sectionWidth)
              .attr("fill", color)
              .attr("stroke", "black")
              .attr("stroke-width", 1);

        group.append("text")
              .attr("text-anchor", "middle")
              .attr("alignment-baseline", "middle")
              .attr("x", sectionWidth / 2)
              .attr("y", 0.1 * entropyMapHeight)
              .attr("class", "annotation-level-3")
              .style("font-weight", "normal")
              .text(i);
    }
    entropyMap.append("text")
              .attr("x", 0.5 * entropyMapWidth)
              .attr("y", 0.9 * entropyMapHeight)
              .attr("class", "annotation-level-3")
              .text("Hamming distance");

    entropyMap.append("text")
              .attr("x", 0)
              .attr("y", 0.5 * entropyMapHeight)
              .attr("transform", "rotate(-90," + 0.01 * entropyMapWidth + "," + 0.45 * entropyMapHeight + ")")
              .attr("class", "annotation-level-3")
              .text("Item #");

    let labels = ['0', maxInnerCircles];
    let labelsY = [entropyMapBarchartY, entropyMapBarchartY - entropyMapBarchartHeight];

    for (let i = 0; i < labels.length; i++) {
        entropyMap.append("text")
                  .attr("x", 0.55 * entropyMapBarchartX)
                  .attr("y", labelsY[i])
                  .attr("class", "annotation-level-3")
                  .style("font-weight", "normal")
                  .text(labels[i]);
    }
}
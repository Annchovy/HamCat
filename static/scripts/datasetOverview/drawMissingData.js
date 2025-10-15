function checkMatch(node, nodeProbable) {
    for (const attribute of attributesChecked) {
        if (node[attribute] !== nodeProbable[attribute]) return false;
    }
    return true;
}


function calculateHammingDistance(nodeId, nodeFocus, nodes) {
    
}


function drawProbableNodes(nodesProbableIds, nodesProbable, nodes) {
    let nodesData = graph.selectAll(".node-group").data;
    for (const nodeId of nodesProbableIds) {


        let circle = {
            x: 0.5 * widthGraph,
            y: 0.5 * heightDegree,
            r: rCurrent,
            fill: colorNode,
            node: nodes[nodeCurrentId],
            id: nodeCurrentId,
            degree: i,
        };
        nodesData.push(circle);
    }
}


function drawMissingDataGraph(nodes, nodesProbable) {
    const nodesProbableIds = new Set(Object.keys(nodesProbable));

    for (const nodeId of Object.keys(nodes)) {
        let nodeGroup = d3.select(`#node-group-${nodeId}`);
        let circles = nodeGroup.selectAll('.inner-circle').data();

        for (const nodeProbableId of nodesProbableIds) {
            let nodeProbable = nodesProbable[nodeProbableId];

            if (checkMatch(nodes[nodeId], nodeProbable)){
                nodesProbableIds.delete(nodeProbableId);
                let arcs = Array.from({length: nodeProbable.count}, () => ({
                    x: 0,
                    y: 0,
                    r: radiusInner,
                    value: nodeProbable.missingness ?? 1
                }))

                const allDataItems = circles.concat(arcs);

                const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(d => d.r)
                        .startAngle(0)
                        .endAngle(d => {
                          const completeness = d.value ?? 1;
                          return completeness * 2 * Math.PI;
                        });

                nodeGroup
                    .selectAll(".inner-circle")
                    .data(allDataItems)
                    .enter()
                    .append("path")
                    .attr("class", "inner-circle")
                    .attr("transform", d => `translate(${d.x}, ${d.y})`)
                    .attr("d", d => arcGenerator(d))
                    .style("fill", colorDatapoint);
            }
        }
    }
    drawProbableNodes(nodesProbableIds, nodesProbable, nodes);
}


function addMissingData(degreeMissingness, nodes) {
    fetch('/extract_probable_nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({'missingness': degreeMissingness}),
            })
            .then(response => response.json())
            .then(data => {
                drawMissingDataGraph(nodes, data.nodesProbable);
            })
    .catch((error) => { console.error('Error:', error); });
}
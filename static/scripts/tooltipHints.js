let hintsObject = {
    "datasetOverview": "This view displays the dataset's name and the degree of missingness included in the analysis. Use the slider to change the % attribute missingness.",
    "attributeOverview": "This view displays the dataset's attribute space with attribute counts, missingness levels per attribute and offers interactions to manipulate the Item Relation View on the right.",
    "attributeCounts": "attributeCounts",
    "missing": "missing",
    "strength": "strength",
    "itemOverview": "itemOverview",
    "entropyMap": "entropyMap",
    "egoHammingGraph": "egoHammingGraph"
};

let rQuestionMark = 7;

function appendTooltipHint(svg, x, y, text) {
    let tooltip = d3.select("body").append("div").attr("class", "tooltip");
    svg.append("circle")
       .attr("cx", x)
       .attr("cy", y)
       .attr("r", rQuestionMark)
       .style("fill", "lightgrey")
       .on("mouseover", function (event) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(text)
                .style("left", (event.clientX + 10) + "px")
                .style("top", event.clientY + "px");
        })
        .on("mouseout", function () {
            tooltip.transition().duration(100).style("opacity", 0);
        });

    svg.append("text")
       .attr("class", "annotation-level-2")
       .attr("x", x)
       .attr("y", y)
       .attr("dx", "-0.3em")
       .attr("dy", "0.4em")
       .style("font-weight", "normal")
       .style("pointer-events", "none")
       .text("?");
}
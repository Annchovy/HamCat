let elementDatasetOverview = d3.select("#dataset-overview").node();
let boundingRectDatasetOverview = elementDatasetOverview.getBoundingClientRect();
let datasetOverviewWidth = boundingRectDatasetOverview.width;
let datasetOverviewHeight = boundingRectDatasetOverview.height;

let datasetOverviewSVG = d3.select("#dataset-overview")
                           .append("svg")
                           .attr("id", "data-overview-svg")
                           .attr("width", datasetOverviewWidth)
                           .attr("height", datasetOverviewHeight);

let overview = datasetOverviewSVG.append("g")
                                 .attr("width", 0.5 * datasetOverviewWidth)
                                 .attr("height", 0.5 * datasetOverviewHeight)
                                 .attr("transform", "translate(0," + 0.5 * datasetOverviewHeight + ")");

overview.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("class", "view-label")
        .text("Dataset Overview");

overview.append("foreignObject")
        .attr("x", 0.09 * datasetOverviewWidth)
        .attr("y", -0.2 * datasetOverviewHeight)
        .attr("width", 0.22 * datasetOverviewHeight)
        .attr("height", 0.22 * datasetOverviewHeight)
        .html(`<i class="fas fa-circle-question" style="color: #99999999; font-size: 14px; cursor: pointer;"></i>`)
        .on("mouseover", function (event) {
            tooltipDatasetOverview.transition().duration(200).style("opacity", 1);
            tooltipDatasetOverview.html("This section gives an overview of the dataset.")
                .style("left", (event.pageX + 10) + "px")
                .style("top", event.pageY + "px");
        })
        .on("mouseout", function () {
            tooltipDatasetOverview.transition().duration(200).style("opacity", 0);
        });

let tooltipDatasetOverview = d3.select("body").append("div").attr("class", "tooltip");

overview.append("text")
        .attr("x", 0)
        .attr("y", 0.3 * datasetOverviewHeight)
        .attr("class", "annotation-level-1")
        .text("Dataset:");

overview.append("text")
        .attr("id", "dataset-name")
        .attr("x", 0.75 * datasetOverviewHeight)
        .attr("y", 0.3 * datasetOverviewHeight)
        .attr("class", "annotation-level-1")
        .style("font-weight", "normal");
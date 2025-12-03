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
                                 .attr("transform", "translate(0," + 0.35 * datasetOverviewHeight + ")");

overview.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("class", "view-label")
        .text("Dataset Overview");

appendTooltipHint(overview, 145, -rQuestionMark, hintsObject["datasetOverview"]);

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
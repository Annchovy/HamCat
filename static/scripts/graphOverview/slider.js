let sliderGraphWidth = 200;
let sliderGraphHeight = 0.9 * datasetOverviewHeight;

let sliderGraphLabelHeight = 0.07 * sliderGraphWidth;

let sliderGraphTranslateX = 0.73 * widthGraph;
let sliderGraphTranslateY = 0.52 * heightGraph;

graphSVG.append("text")
      .attr("class", "annotation-level-2")
      .attr("x", 0.65 * widthGraph)
      .attr("y", 0.53 * heightGraph)
      .text("Bin size:");

let sliderGraph = graphSVG.append("g")
                      .attr("class", "slider")
                      .attr("transform", `translate(${sliderGraphTranslateX}, ${sliderGraphTranslateY})`);

function buildSliderGraph(binSizeMax){
    sliderGraph.selectAll("*").remove();

    const xGraph = d3.scaleLinear()
      .domain([1, binSizeMax])
      .range([0, sliderGraphWidth])
      .clamp(true);

    sliderGraph.append("line")
      .attr("class", "slider-track")
      .attr("x1", xGraph.range()[0])
      .attr("x2", xGraph.range()[1]);

    const fillGraph = sliderGraph.append("line")
      .attr("class", "slider-fill")
      .attr("x1", xGraph.range()[0])
      .attr("x2", xGraph.range()[0]);

    const handleGraph = sliderGraph.append("circle")
      .attr("class", "slider-handle")
      .attr("r", 5)
      .attr("cx", xGraph(1));

    const labelGraph = sliderGraph.append("text")
      .attr("class", "slider-label")
      .attr("y", sliderGraphLabelHeight)
      .attr("x", xGraph.range()[0])
      .text(1);

    sliderGraph.append("text")
      .attr("class", "slider-label")
      .attr("y", sliderGraphLabelHeight)
      .attr("x", xGraph.range()[0])
      .text(1);

    sliderGraph.append("text")
      .attr("class", "slider-label")
      .attr("y", sliderGraphLabelHeight)
      .attr("x", xGraph(binSizeMax))
      .text(binSizeMax);

    const dragGraph = d3.drag()
      .on("drag", (event) => {
        let px = event.x;
        px = Math.max(0, Math.min(px, sliderGraphWidth));
        const value = Math.round(xGraph.invert(px));
        updateSlider(value);
      })
      .on("end", (event) => {
        let px = event.x;
        px = Math.max(0, Math.min(px, sliderGraphWidth));
        const value = Math.round(xGraph.invert(px));
      });

    handleGraph.call(dragGraph);

    function updateSlider(value) {
      const pos = xGraph(value);
      handleGraph.attr("cx", pos);
      fillGraph.attr("x2", pos);
      labelGraph.attr("x", pos).text(`${value}`);
      binning = value;
      drawDataItemView();
    }

    updateSlider(1);
}
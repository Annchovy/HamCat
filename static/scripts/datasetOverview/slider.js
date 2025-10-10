let sliderWidth = 0.17 * datasetOverviewWidth;
let sliderHeight = 0.9 * datasetOverviewHeight;

let sliderLabelHeight = 0.07 * sliderWidth;

let sliderTranslateX = 0.25 * datasetOverviewWidth;
let sliderTranslateY = 0.75 * datasetOverviewHeight;

datasetOverviewSVG.append("text")
                  .attr("class", "annotation-level-2")
                  .attr("x", 0.985 * sliderTranslateX)
                  .attr("y", 0.8 * sliderTranslateY)
                  .text("% attribute missingness to include in analysis");

const slider = datasetOverviewSVG.append("g")
                                  .attr("class", "slider")
                                  .attr("transform", `translate(${sliderTranslateX}, ${sliderTranslateY})`);

const x = d3.scaleLinear()
  .domain([0, 100])
  .range([0, sliderWidth])
  .clamp(true);

slider.append("line")
  .attr("class", "slider-track")
  .attr("x1", x.range()[0])
  .attr("x2", x.range()[1]);

const fill = slider.append("line")
  .attr("class", "slider-fill")
  .attr("x1", x(0))
  .attr("x2", x(0));

const handle = slider.append("circle")
  .attr("class", "slider-handle")
  .attr("r", 5)
  .attr("cx", x(0));

const label = slider.append("text")
  .attr("class", "slider-label")
  .attr("y", sliderLabelHeight)
  .attr("x", x(0))
  .text("0");

slider.append("text")
  .attr("class", "slider-label")
  .attr("y", sliderLabelHeight)
  .attr("x", x(0))
  .text("0");

slider.append("text")
  .attr("class", "slider-label")
  .attr("y", sliderLabelHeight)
  .attr("x", x(100))
  .text("100");

const drag = d3.drag()
  .on("drag", (event) => {
    let px = event.x;
    px = Math.max(0, Math.min(px, sliderWidth));
    const value = Math.round(x.invert(px));
    updateSlider(value);
  });

handle.call(drag);

function updateSlider(value) {
  const pos = x(value);
  handle.attr("cx", pos);
  fill.attr("x2", pos);
  label.attr("x", pos).text(`${value}`);
}

updateSlider(0);
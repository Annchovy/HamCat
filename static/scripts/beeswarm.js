var element = d3.select('#beeswarm-plots').node();
var boundingRect = element.getBoundingClientRect();
var widthBeeswarm = boundingRect.width;
var heightBeeswarm = boundingRect.height;

var widthQuestion = 0.6 * widthBeeswarm;
var heightQuestion = 0.08 * heightBeeswarm;

var numberQuestions = 10 * (0.1 * heightBeeswarm + heightQuestion);

let beeswarm = d3.select("#beeswarm-plots")
                .append("svg")
                .attr("width", widthBeeswarm)
                .attr("height", 10 * heightBeeswarm);

const yCenter = heightQuestion / 2;


function createQuestionBeeswarm(categories, dataBeeswarm, number, questionID) {
    const top = number * 0.1 * heightBeeswarm + (number - 1) * heightQuestion;
    const left = 0.07 * widthBeeswarm;
    let question = beeswarm.append("g")
                        .attr("width", widthQuestion)
                        .attr("height", heightQuestion)
                        .attr("transform",  "translate(" + left + "," + top + ")");

    const questionLeft = left;
    const questionRight = widthQuestion + left;

    const xScale = d3.scalePoint()
      .domain(categories)
      .range([questionLeft, questionRight]);

    let tickPositions = new Map(categories.map(d => [d, xScale(d)]));

    let simulation = d3.forceSimulation(dataBeeswarm)
      .force("x", d3.forceX(d => tickPositions.get(d.category)).strength(0.3))
      .force("y", d3.forceY(yCenter).strength(0.05))
      .force("collide", d3.forceCollide(4.5))
      .alphaDecay(0.01)
      .on("tick", ticked);

    question.append("text")
        .attr("x", 0)
        .attr("y", yCenter)
        .attr("dy", ".35em")
        .text(questionID);

    const xAxis = question.append('line')
      .attr("x1", questionLeft)
      .attr("x2", questionRight)
      .attr("y1", yCenter)
      .attr("y2", yCenter)
      .style("stroke-width", 1)
      .style("stroke", 'lightgrey');

    const ticksFixed = question.selectAll('line')
                            .data(categories)
                            .enter()
                            .append('line')
                            .attr("x1", d => tickPositions.get(d))
                            .attr("x2", d => tickPositions.get(d))
                            .attr("y1", yCenter - 5)
                            .attr("y2", yCenter + 5)
                            .style('stroke-width', 2)
                            .style('stroke', 'lightgrey');

    const tickLabels = question.selectAll('.tick-label')
        .data(categories)
        .enter()
        .append('text')
        .attr('class', 'tick-label')
        .attr("x", d => tickPositions.get(d))
        .attr("y", yCenter + 40)
        .attr("text-anchor", "middle")
        .text(d => d)
        .style("fill", "black")
        .style("font-size", "12px");

    let circles = question.selectAll(".circ")
        .data(dataBeeswarm)
        .enter()
        .append("circle")
        .attr("class", "circ")
        .attr("fill", "#e66101")
        .attr("r", 4)

    function ticked() {
      circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    }

    let ticks = question.selectAll(".tick-line")
      .data(categories)
      .join("line")
      .attr("class", "tick-line")
      .attr("x1", d => tickPositions.get(d))
      .attr("x2", d => tickPositions.get(d))
      .attr("y1", 0.2 * heightQuestion)
      .attr("y2", 0.8 * heightQuestion)
      .style("stroke-width", 1.5)
      .style('stroke', 'grey')
      .style("pointer-events", "all");

    const drag = d3.drag()
        .on("drag", function(event, d) {
            const newX = Math.max(questionLeft, Math.min(questionRight, event.x));
            tickPositions.set(d, newX);
            d3.select(this)
              .attr("x1", newX)
              .attr("x2", newX);
            simulation.force("x", d3.forceX(d => tickPositions.get(d.category)).strength(0.3));
            simulation.alpha(0.5).restart();
            tickLabels.attr("x", d => tickPositions.get(d));
        })
        .on("end", function(event, d) {
            const newX = event.x;
            const proportion = (newX - questionLeft) / widthQuestion;
            const categoryRange = d3.max(categories) - d3.min(categories);
            categoriesMap[questionID][d] = d3.min(categories) + categoryRange * proportion;
        });

    ticks.call(drag);
}

var categoriesMap = {};

d3.json("/questions_answers").then(data => {
    var questions = data.questions;
    var answers = data.answers;
    var number = 1;
    for (const [key, value] of Object.entries(questions)) {
        categoriesMap[key] = value.options.reduce((acc, curr) => { acc[curr] = curr; return acc; }, {});
        let answersObjects = answers[key].map(d => ({ category: d }));
        createQuestionBeeswarm(value.options, answersObjects, number, key);
        number++;
    }
});
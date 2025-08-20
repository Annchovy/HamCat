var element = d3.select('#beeswarm-plots').node();
var boundingRect = element.getBoundingClientRect();
var widthBeeswarm = boundingRect.width;
var heightBeeswarm = boundingRect.height;

var widthQuestion = 0.6 * widthBeeswarm;
var heightQuestion = 0.08 * heightBeeswarm;

var numberQuestions = 10 * (0.1 * heightBeeswarm + heightQuestion);

let optionsUnchecked = {};
let attributesChecked;

let beeswarm = d3.select("#beeswarm-plots")
                .append("svg")
                .attr("width", widthBeeswarm)
                .attr("height", 10 * heightBeeswarm);

beeswarm.append("text")
        .attr("dx", 0.4 * widthBeeswarm)
        .attr("dy", "2em")
        .text("Attributes")
        .attr("class", "view-title");

const yCenter = heightQuestion / 2;

function addNodes(questionId, category) {
    for (const key in nodesRemoved) {
        if (nodesRemoved[key][questionId] === category) {
            let returnNodeFlag = true;
            for (const question in optionsUnchecked) {
                if (nodesRemoved[key][question] in optionsUnchecked[question]) {
                    returnNodeFlag = false;
                    break;
                }
            }
            if (returnNodeFlag) {
                nodes[key] = nodesRemoved[key];
                delete nodesRemoved[key];
            }
        }
    }
}

function removeNodes(questionId, category) {
    for (const key in nodes) {
        const answer = nodes[key][questionId];
        if (answer === category) {
            nodesRemoved[key] = nodes[key];
            delete nodes[key];
        }
    }
}

function appendCheckBoxes(question, questionId, categories, tickPositions) {
    // append question check boxes
    question.append("foreignObject")
        .attr("x", -0.08 * widthQuestion)
        .attr("y", 0.375 * heightQuestion)
        .attr("width", 0.3 * heightQuestion)
        .attr("height", 0.3 * heightQuestion)
        .append("xhtml:body")
        .append("input")
        .attr("type", "checkbox")
        .attr("id", questionId)
        .attr("class", "checkbox-question")
        .property("checked", true)
        .on("change", function() {
            const isChecked = d3.select(this).property("checked");
            const attribute = d3.select(this).attr("id");
            if (isChecked) { attributesChecked.add(attribute); }
            else { attributesChecked.delete(attribute); }
            fetch('/recalculate_graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({'attributes': Array.from(attributesChecked)}),
            })
            .then(response => response.json())
            .then(data => {
                graph.selectAll("*").remove();
                nodes = data.nodes;
                edges = data.edges;
                drawDataItemView();
            })
            .catch((error) => { console.error('Error:', error); });
        })

    question.append("text")
            .attr("x", 0)
            .attr("y", yCenter)
            .attr("dy", ".35em")
            .text(questionId);

    // append option check boxes
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let tickPosition = tickPositions.get(category);
        question.append("foreignObject")
            .attr("x", tickPosition - 0.035 * widthQuestion)
            .attr("y", 1.15 * heightQuestion)
            .attr("width", 0.3 * heightQuestion)
            .attr("height", 0.3 * heightQuestion)
            .attr("id", `${questionId}-${i}`)
            .append("xhtml:body")
            .append("input")
            .attr("type", "checkbox")
            .attr("class", "checkbox-question")
            .property("checked", true)
            .on("change", function() {
                const isChecked = d3.select(this).property("checked");
                if (isChecked) {
                    optionsUnchecked[questionId].delete(category);
                    addNodes(questionId, category);
                }
                else {
                    if (questionId in optionsUnchecked) { optionsUnchecked[questionId].add(category); }
                    else { optionsUnchecked[questionId] = new Set([category]); }
                    removeNodes(questionId, category);
                }
                graph.selectAll("*").remove();
                drawDataItemView();
            });
    }
}

function createQuestionBeeswarm(categories, dataBeeswarm, number, questionId) {
    const top = number * 0.1 * heightBeeswarm + (number - 1) * heightQuestion;
    const left = 0.1 * widthBeeswarm;
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
                            .attr("r", 4);

    function ticked() {
      circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
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
            // optimize!
            let i = categories.indexOf(d);
            let checkbox = d3.select(`#${questionId}-${i}`);
            checkbox.attr("x", newX - 0.035 * widthQuestion);
        })
        .on("end", function(event, d) {
            const newX = event.x;
            const proportion = (newX - questionLeft) / widthQuestion;
            const categoryRange = d3.max(categories) - d3.min(categories);
            categoriesMap[questionId][d] = d3.min(categories) + categoryRange * proportion;
        });

    ticks.call(drag);

    appendCheckBoxes(question, questionId, categories, tickPositions);
}

var categoriesMap = {};

d3.json("/attributes_items").then(data => {
    var questions = data.attributes;
    var answers = data.items;
    attributesChecked = new Set(Object.keys(questions));

    number = 1;
    for (const [key, value] of Object.entries(questions)) {
        categoriesMap[key] = value.options.reduce((acc, curr) => { acc[curr] = curr; return acc; }, {});
        let answersObjects = answers[key].map(d => ({ category: d }));
        createQuestionBeeswarm(value.options, answersObjects, number, key);
        number++;
    }
});
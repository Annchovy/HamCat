let elementBeeswarm = d3.select('#beeswarm-plots').node();
let boundingRectBeeswarm = elementBeeswarm.getBoundingClientRect();
let widthBeeswarm = boundingRectBeeswarm.width;
let heightBeeswarm = boundingRectBeeswarm.height;

let widthQuestion = 0.55 * widthBeeswarm;
let heightQuestion = 0.08 * heightBeeswarm;

let numberQuestions;

let optionsUnchecked = {};
let questions, attributesChecked;
let answers;
let radiusBeeswarm = 4;
let colorBeeswarm = "#f4a582";
let colorBeeswarmMissing = "#d6604d";

let beeswarmSVG = d3.select("#beeswarm-plots")
                    .append("svg")
                    .attr("width", widthBeeswarm);

beeswarmSVG.append("text")
           .attr("x", 0.75 * widthBeeswarm)
           .attr("y", 0.04 * heightBeeswarm)
           .attr("class", "visualization-label")
           .text("Missing");

beeswarmSVG.append("text")
           .attr("x", 0.9 * widthBeeswarm)
           .attr("y", 0.04 * heightBeeswarm)
           .attr("class", "visualization-label")
           .text("Force");

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

function updateCirclesBasedOnOption(questionId, category, opacity) {
    let circleIds = [];

    const numberOfIndividuals = answers[Object.keys(answers)[0]].length;
    for (let i = 0; i < numberOfIndividuals; i++) {
        if (answers[questionId][i] == category) {
            for (const key of Object.keys(answers)) {
                circleIds.push(`${key}-${answers['id'][i]}`);
            }
        }
    }

     circleIds.forEach(id => {
        d3.select(`#${CSS.escape(id)}`).transition().attr("opacity", opacity);
    });
}

function updateCirclesBasedOnQuestion(questionId, opacity) {
    let circleIds = [];
    const numberOfIndividuals = answers[Object.keys(answers)[0]].length;
    for (let i = 0; i < numberOfIndividuals; i++) {
        circleIds.push(`${questionId}-${answers['id'][i]}`);
    }

     circleIds.forEach(id => {
        d3.select(`#${CSS.escape(id)}`).transition().attr("opacity", opacity);
    });
}


function appendCheckBoxes(question, questionId, categories, tickPositions) {
    // append question check boxes
    question.append("foreignObject")
        .attr("x", -0.05 * widthQuestion)
        .attr("y", 0.65 * heightQuestion)
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
            if (isChecked) {
            attributesChecked.add(attribute);
            updateCirclesBasedOnQuestion(questionId, 1)
            }
            else { attributesChecked.delete(attribute);
            updateCirclesBasedOnQuestion(questionId, 0.3)}
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
            .attr("x", -0.05 * widthQuestion)
            .attr("y", yCenter)
            .attr("dy", ".35em")
            .attr("dx", ".25em")
            .attr("class", "question-label")
            .text(questionId);

    // append option check boxes
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let tickPosition = tickPositions.get(category);
        question.append("foreignObject")
            .attr("x", tickPosition - 0.035 * widthQuestion)
            .attr("y", 1.2 * heightQuestion)
            .attr("width", 0.3 * heightQuestion)
            .attr("height", 0.3 * heightQuestion)
            .attr("id", `tick-${questionId}-${i}`)
            .append("xhtml:body")
            .append("input")
            .attr("type", "checkbox")
            .attr("class", "checkbox-question")
            .property("checked", true)
            .on("change", function() {
                const isChecked = d3.select(this).property("checked");
                if (isChecked) {
                    optionsUnchecked[questionId].delete(category);
                    updateCirclesBasedOnOption(questionId, category, 1);
                    addNodes(questionId, category);
                }
                else {
                    if (questionId in optionsUnchecked) { optionsUnchecked[questionId].add(category); }
                    else { optionsUnchecked[questionId] = new Set([category]); }
                    updateCirclesBasedOnOption(questionId, category, 0.3);
                    removeNodes(questionId, category);
                }
                graph.selectAll("*").remove();
                drawDataItemView();
            });
    }
}

function createQuestionBeeswarm(categories, dataBeeswarm, number, questionId) {
    const top = 0.03 * heightBeeswarm + (number - 1) * (0.1 * heightBeeswarm + heightQuestion);
    const left = 0.07 * widthBeeswarm;
    const categoryWidth = widthQuestion / categories.length;
    let question = beeswarmSVG.append("g")
                        .attr("width", widthQuestion)
                        .attr("height", heightQuestion)
                        .attr("transform",  "translate(" + left + "," + top + ")");

    // calc missingness and display only present values
    let withCategory = [];
    let withoutCategory = [];

    dataBeeswarm.forEach(item => {
        if (item.category !== null && item.category !== '') {
            withCategory.push(item);
        } else {
            withoutCategory.push(item);
        }
    });

    const missingness = Object.keys(withoutCategory).length / Object.keys(dataBeeswarm).length * 100;
    question.append("text")
            .attr("x", 1.25 * widthQuestion)
            .attr("y", 0.55 * heightQuestion)
            .attr("class", "visualization-label")
            .text(`${missingness.toFixed(2)}%`);

    const questionLeft = left;
    const questionRight = widthQuestion + left;

    const xScale = d3.scalePoint()
                      .domain(categories)
                      .range([questionLeft, questionRight]);

    let tickPositions = new Map(categories.map(d => [d, xScale(d)]));

    let simulation = d3.forceSimulation(withCategory)
                      .force("x", d3.forceX(d => tickPositions.get(d.category)).strength(0.3))
                      .force("y", d3.forceY(yCenter).strength(0.05))
                      .force("collide", d3.forceCollide(1.1 * radiusBeeswarm))
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
                            .attr("y1", yCenter - 3)
                            .attr("y2", yCenter - 3)
                            .style('stroke-width', 5)
                            .style('stroke', 'lightgrey');

    // Dashed lines between categories
    let positions = categories.map((x) => tickPositions.get(x));
    const separationLines = [];
    for (let i = 0; i < positions.length - 1; i++) {
        separationLines.push((positions[i] + positions[i+1]) / 2);
    }

    question.selectAll(".category-separator")
            .data(separationLines)
            .enter()
            .append("line")
            .attr("class", "category-separator")
            .attr("x1", d => d)
            .attr("x2", d => d)
            .attr("y1", 0)
            .attr("y2", heightQuestion)
            .style("stroke", "#999")
            .style("stroke-dasharray", "4,3")
            .style("stroke-width", 1);

    const tickLabels = question.selectAll('.tick-label')
                            .data(categories)
                            .enter()
                            .append('text')
                            .attr('class', 'tick-label')
                            .attr("x", d => tickPositions.get(d))
                            .attr("y", yCenter + 40)
                            .attr("text-anchor", "middle")
                            .text(d => d)
                            .style("fill", "black");

    const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(radiusBeeswarm);

    let circles = question.selectAll(".circ")
                        .data(withCategory)
                        .enter()
                        .append("path")
                        .attr("class", "circ")
                        .attr("id", d => `${questionId}-${d.id}`)
                        .attr("fill", d => d.value < 1 ? colorBeeswarmMissing : colorBeeswarm)
                        .attr("d", d => {
                            const completeness = d.value ?? 1;
                            const endAngle = completeness * 2 * Math.PI;
                            return arcGenerator({ startAngle: 0, endAngle: endAngle });
                        });

    function ticked() {
      circles.attr("transform", d => `translate(${d.x}, ${d.y})`);
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
            // Optimize!
            let i = categories.indexOf(d);
            let checkbox = d3.select(`#tick-${questionId}-${i}`);
            checkbox.attr("x", newX - 0.035 * widthQuestion);
        })
        .on("end", function(event, d) {
            const newX = event.x;
            const proportion = (newX - questionLeft) / widthQuestion;
            const categoryRange = d3.max(categories) - d3.min(categories);
            categoriesMap[questionId][d] = d3.min(categories) + categoryRange * proportion;
            const categoryNew = Math.floor((newX - left) / categoryWidth);
            questions[questionId]['options_categories'][d] = categoryNew;
            fetch('/recalculate_graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({'attribute_description': questions})
            })
            .then(response => response.json())
            .then(data => {
                graph.selectAll("*").remove();
                nodes = data.nodes;
                edges = data.edges;
                drawDataItemView();
            })
            .catch((error) => { console.error('Error:', error); });
        });

    ticks.call(drag);

    appendCheckBoxes(question, questionId, categories, tickPositions);

    // Add strength selectors
    question.append("foreignObject")
        .attr("x", left + 1.37 * widthQuestion)
        .attr("y", 0.3 * heightQuestion)
        .attr("width", 0.16 * widthQuestion)
        .attr("height", 0.4 * heightQuestion)
        .attr("id", `strength-${questionId}`)
        .append("xhtml:body")
        .append("input")
        .attr("type", "number")
        .attr("min", 0)
        .attr("max", 5)
        .attr("step", 0.5)
        .attr("value", 0)
        .attr("class", "question-slider")
        .on("change", function () {
            const value = +this.value;
            applyQuestionBasedForceGraph(questionId, value);
    });
}

let categoriesMap = {};

d3.json("/attributes_items").then(data => {
    questions = data.attributes;
    answers = data.items;
    let groupings = data.groupings;
    attributesChecked = new Set(Object.keys(questions));
    console.log(questions);
    beeswarmSVG.attr("height", (Object.keys(questions).length + 1) * (heightQuestion + 0.1 * heightBeeswarm));

    const numberOfIndividuals = answers[Object.keys(answers)[0]].length;
    let individualMissingCounts = new Array(numberOfIndividuals).fill(0);
    let totalAttributes = Object.keys(answers).length;

    for (let question of Object.keys(answers)) {
        answers[question].forEach((value, index) => {
            if (value === null || value === "") {
                individualMissingCounts[index]++;
            }
        });
    }

    number = 1;
    for (const key of data.attributesOrder) {
        const value = questions[key];
        categoriesMap[key] = value.options.reduce((acc, curr) => { acc[curr] = curr; return acc; }, {});
        let answersObjects = answers[key].map((d, index) => ({ category: d,
                                                               value: 1 - individualMissingCounts[index] / totalAttributes,
                                                               id: answers['id'][index]}));
        let options = value.options.map(d => d.toString())
        createQuestionBeeswarm(options, answersObjects, number, key);
        number++;
    }
});
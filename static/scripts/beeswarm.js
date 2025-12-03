let elementBeeswarm = d3.select('#attribute-overview').node();
let boundingRectBeeswarm = elementBeeswarm.getBoundingClientRect();
let widthBeeswarm = boundingRectBeeswarm.width;
let heightBeeswarm = boundingRectBeeswarm.height;

let heightAttributeOverviewHeader = 0.1 * heightBeeswarm;
let heightAttributeOverviewLabels = 0.5 * heightBeeswarm;

let widthQuestion = 0.54 * widthBeeswarm;
let heightQuestion = 0.09 * heightBeeswarm;

let keyAttribute = 'Gender';
const colorMap = { "other": "green", "female": "#DD6C40", "male": "#509DA9" };
//let keyAttribute = 'cntry';
//const colorMap = { "CH": "#509DA9", "HU": "#DD6C40"}

let radiusBeeswarm = 4;
let colorBeeswarm = "#d5529b";
const arcGenerator = d3.arc()
                    .innerRadius(0)
                    .outerRadius(radiusBeeswarm);
let simulations = {};

let numberQuestions, questions, attributesChecked, answers, attributesOrderBeeswarm;
let optionsUnchecked = {};
let nodesRemoved = {};

let beeswarmSVG = d3.select("#attribute-overview").append("svg")
                                              .attr("width", widthBeeswarm)
                                              .attr("transform", `translate(${0.03 * widthBeeswarm}, 0)`);

let overviewAttributeHeader = beeswarmSVG.append("g")
                                           .attr("width", widthBeeswarm)
                                           .attr("height", heightAttributeOverviewHeader)
                                           .attr("transform", `translate(0, ${0.02 * heightBeeswarm})`);

overviewAttributeHeader.append("text")
                       .attr("class", "view-label")
                       .text("Attribute Overview");

appendTooltipHint(overviewAttributeHeader, 155, -rQuestionMark, hintsObject["attributeOverview"]);

let textsAttributeOverview = ["Check selection boxes below to include attributes and attribute categories in Item Relation Overview to the right.",
                              "Drag attribute categories to the same region (separated by dashed lines) to merge these categories."];
let textsAttributeOverviewY = [0.3 * heightAttributeOverviewHeader, 0.55 * heightAttributeOverviewHeader];

for (let i = 0; i < textsAttributeOverview.length; i++) {
    overviewAttributeHeader.append("text")
                       .attr("x", 0)
                       .attr("y", textsAttributeOverviewY[i])
                       .attr("class", "annotation-level-2")
                       .style("font-weight", "normal")
                       .text(textsAttributeOverview[i]);
}

let overviewAttributeLabels = beeswarmSVG.append("g")
                                           .attr("width", widthBeeswarm)
                                           .attr("height", heightAttributeOverviewHeader)
                                           .attr("transform", `translate(0, ${0.125 * heightBeeswarm})`);

let labelsAttributeOverview = ["Attribute and Attribute Level Counts", "Missing %", "Strength"];
let labelsAttributeOverviewX = [0,
                                0.65 * widthBeeswarm,
                                0.8 * widthBeeswarm];

for (let i = 0; i < labelsAttributeOverview.length; i++) {
    overviewAttributeLabels.append("text")
                       .attr("x", labelsAttributeOverviewX[i])
                       .attr("y", 0)
                       .attr("class", "annotation-level-1")
                       .text(labelsAttributeOverview[i]);
}

appendTooltipHint(overviewAttributeLabels, 255, -rQuestionMark, hintsObject["attributeCounts"]);
appendTooltipHint(overviewAttributeLabels, 0.69 * widthBeeswarm + 50, -rQuestionMark, hintsObject["missing"]);
appendTooltipHint(overviewAttributeLabels, 0.83 * widthBeeswarm + 50, -rQuestionMark, hintsObject["strength"]);


let overviewAttribute = beeswarmSVG.append("g")
                                   .attr("class", "scrollable")
                                   .attr("width", widthBeeswarm)
                                   .attr("transform", `translate(0, ${0.17 * heightBeeswarm})`);

const yCenter = heightQuestion / 2;

function updateCirclesBasedOnOption(questionId, category, opacityStep) {
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
        let circleCurrent = d3.select(`#${CSS.escape(id)}`);
        if (!circleCurrent.empty()) {
            let counterOpacity = Number(circleCurrent.attr("counter-opacity")) + opacityStep;
            circleCurrent.attr("counter-opacity", counterOpacity);
            let opacity = counterOpacity === 0 ? 1 : 0.5
            circleCurrent.transition().attr("opacity", opacity);
        }
    });
}

function updateCirclesBasedOnQuestion(questionId, opacityStep) {
    let circleIds = [];
    const numberOfIndividuals = answers[Object.keys(answers)[0]].length;
    for (let i = 0; i < numberOfIndividuals; i++) {
        circleIds.push(`${questionId}-${answers['id'][i]}`);
    }

     circleIds.forEach(id => {
        let circleCurrent = d3.select(`#${CSS.escape(id)}`);
        if (!circleCurrent.empty()) {
            let counterOpacity = Number(circleCurrent.attr("counter-opacity")) + opacityStep;
            circleCurrent.attr("counter-opacity", counterOpacity);
            let opacity = counterOpacity === 0 ? 1 : 0.5
            circleCurrent.transition().attr("opacity", opacity);
        }
    });
}

function appendCheckBoxes(question, questionId, categories, tickPositions) {
    // append question check boxes
    question.append("foreignObject")
        .attr("x", 0)
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
                updateCirclesBasedOnQuestion(questionId, 1);
            }
            else {
                attributesChecked.delete(attribute);
                updateCirclesBasedOnQuestion(questionId, -1);
            }
            let attributeLevelsExcluded = Object.fromEntries(Object.entries(optionsUnchecked).map(([key, value]) => [key, [...value]]));
            fetch('/recalculate_graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({'attributes': Array.from(attributesChecked),
                                      'attribute_description': questions,
                                      'attribute_levels_excluded': attributeLevelsExcluded,
                                      'missingness': degreeMissingness}),
            })
            .then(response => response.json())
            .then(data => {
                nodes = data.nodes;
                edges = data.edges;
                drawDataItemView();
                buildSliderGraph(attributesChecked.size + 1);
            })
            .catch((error) => { console.error('Error:', error); });
        })

    let tooltip = d3.select("body").append("div").attr("class", "tooltip");
    question.append("text")
            .attr("x", 0)
            .attr("y", yCenter)
            .attr("dy", ".35em")
            .attr("dx", ".25em")
            .attr("class", "annotation-level-2")
            .text(questionId)
            .on("mouseover", function (event) {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(questions[questionId].text)
                    .style("left", (event.clientX + 10) + "px")
                    .style("top", event.clientY + "px");
            })
            .on("mouseout", function () {
                tooltip.transition().duration(100).style("opacity", 0);
            });

    // append option check boxes
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let tickPosition = tickPositions.get(category);
        question.append("foreignObject")
            .attr("x", tickPosition - 0.022 * widthQuestion)
            .attr("y", 1.25 * heightQuestion)
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
                }
                else {
                    if (questionId in optionsUnchecked) { optionsUnchecked[questionId].add(category); }
                    else { optionsUnchecked[questionId] = new Set([category]); }
                    updateCirclesBasedOnOption(questionId, category, -1);
                }
                let attributeLevelsExcluded = Object.fromEntries(Object.entries(optionsUnchecked).map(([key, value]) => [key, [...value]]));
                fetch('/recalculate_graph', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({'attributes': Array.from(attributesChecked),
                                          'attribute_description': questions,
                                          'attribute_levels_excluded': attributeLevelsExcluded,
                                          'missingness': degreeMissingness}),
                })
                .then(response => response.json())
                .then(data => {
                    nodes = data.nodes;
                    edges = data.edges;
                    drawDataItemView();
                    buildSliderGraph(attributesChecked.size + 1);
                })
                .catch((error) => { console.error('Error:', error); });
                });
    }
}

function createQuestionBeeswarm(categories, dataBeeswarm, number, questionId) {
    const top = (number - 1) * (0.1 * heightBeeswarm + heightQuestion);
    const left = 0.08 * widthBeeswarm;
    const categoryWidth = widthQuestion / categories.length;
    let question = overviewAttribute.append("g")
                                    .attr("id", `question-section-${questionId}`)
                                    .attr("class", "question-section")
                                    .attr("width", widthQuestion)
                                    .attr("height", heightQuestion)
                                    .attr("transform",  "translate(0," + top + ")");

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
            .attr("class", "annotation-level-2")
            .attr("id", `${questionId}-missingness`)
            .style("font-weight", "normal")
            .text(`${missingness.toFixed(2)}`);

    const questionLeft = left;
    const questionRight = widthQuestion + left;

    const xScale = d3.scalePoint()
                      .domain(categories)
                      .range([questionLeft, questionRight]);

    let tickPositions = new Map(categories.map(d => [d, xScale(d)]));

    let simulationBeeswarm = d3.forceSimulation(withCategory)
                      .force("x", d3.forceX(d => tickPositions.get(d.category)).strength(0.3))
                      .force("y", d3.forceY(yCenter).strength(0.05))
                      .force("collide", d3.forceCollide(1.1 * radiusBeeswarm))
                      .alphaDecay(0.01)
                      .on("tick", ticked);

    simulations[questionId] = simulationBeeswarm;

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
                            .attr("y", yCenter + 0.7 * heightQuestion)
                            .attr("text-anchor", "middle")
                            .text(d => d)
                            .style("fill", "black");

    let ticks = question.selectAll(".tick-line")
                  .data(categories)
                  .join("line")
                  .attr("class", "tick-line")
                  .attr("x1", d => tickPositions.get(d))
                  .attr("x2", d => tickPositions.get(d))
                  .attr("y1", 0.2 * heightQuestion)
                  .attr("y2", 0.8 * heightQuestion)
                  .style("stroke-width", 1.5)
                  .style('stroke', 'grey');

    let circles = question.selectAll(".circ")
                        .data(withCategory)
                        .enter()
                        .append("path")
                        .attr("class", "circ")
                        .attr("id", d => `${questionId}-${d.id}`)
                        .attr("fill", d => (d.key in colorMap ? colorMap[d.key] : colorBeeswarm))
                        //.attr("fill", colorBeeswarm)
                        .attr("counter-opacity", 0)
                        .style("pointer-events", "none")
                        .attr("d", d => {
                            const completeness = d.value ?? 1;
                            const endAngle = completeness * 2 * Math.PI;
                            return arcGenerator({ startAngle: 0, endAngle: endAngle });
                        });

    function ticked() {
      question.selectAll(".circ").attr("transform", d => `translate(${d.x}, ${d.y})`);
    }

    const drag = d3.drag()
        .on("drag", function(event, d) {
            const newX = Math.max(questionLeft, Math.min(questionRight, event.x));
            tickPositions.set(d, newX);
            d3.select(this)
              .attr("x1", newX)
              .attr("x2", newX);
            simulationBeeswarm.force("x", d3.forceX(d => tickPositions.get(d.category)).strength(0.3));
            simulationBeeswarm.alpha(0.5).restart();
            tickLabels.attr("x", d => tickPositions.get(d));
            let i = categories.indexOf(d);
            let checkbox = d3.select(`#tick-${questionId}-${i}`);
            checkbox.attr("x", newX - 0.022 * widthQuestion);
        })
        .on("end", function(event, d) {
            const newX = event.x;
            const region = widthQuestion / (categories.length - 1);
            const categoryLength = newX - questionLeft;
            let categoryNew;
            if (categoryLength <= region/2) {
               categoryNew = 0;
            }
            else if (categoryLength > (categories.length - 1.5) * region) {
               categoryNew = categories.length - 1;
            }
            else {
               categoryNew = Math.floor((categoryLength - region/2) / region) + 1;
            }

            questions[questionId]['options_categories'][d] = categoryNew;
            let attributeLevelsExcluded = Object.fromEntries(Object.entries(optionsUnchecked).map(([key, value]) => [key, [...value]]));
            fetch('/recalculate_graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({'attributes': Array.from(attributesChecked),
                                      'attribute_description': questions,
                                      'attribute_levels_excluded': attributeLevelsExcluded,
                                      'missingness': degreeMissingness})
            })
            .then(response => response.json())
            .then(data => {
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
        .attr("x", left + 1.38 * widthQuestion)
        .attr("y", 0.35 * heightQuestion)
        .attr("width", 0.135 * widthQuestion)
        .attr("height", 0.4 * heightQuestion)
        .attr("id", `strength-${questionId}`)
        .append("xhtml:body")
        .append("input")
        .attr("type", "number")
        .attr("min", 0)
        .attr("max", 150)
        .attr("step", 0.5)
        .attr("value", 0)
        .attr("class", "question-selector")
        .on("change", function () {
            const value = +this.value;
            applyQuestionBasedForceGraph(questionId, value);
    });
}

function updateAttributeView(){
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

    for (const questionId of attributesOrderBeeswarm){
        let answersObjects = answers[questionId].map((d, index) => ({ category: d,
                                                       value: 1 - individualMissingCounts[index] / totalAttributes,
                                                       id: answers['id'][index],
                                                       key: answers[keyAttribute][index]}));
        answersObjects = answersObjects.filter(d => d.category !== "");

        let simulationBeeswarm = simulations[questionId];
        const emptyValues = answers[questionId].filter(item => item === null || item === undefined || item === "");
        const missingness = emptyValues.length / answers[questionId].length * 100;
        let question = d3.select(`#question-section-${questionId}`);
        d3.select(`#${questionId}-missingness`).text(`${missingness.toFixed(2)}`);

        question.selectAll(".circ").remove();
        question.selectAll(".circ")
                        .data(answersObjects)
                        .enter()
                        .append("path")
                        .attr("class", "circ")
                        .attr("id", d => `${questionId}-${d.id}`)
                        .attr("fill", d => (d.key in colorMap ? colorMap[d.key] : colorBeeswarm))
                        .attr("counter-opacity", 0)
                        .attr("d", d => {
                            const completeness = d.value ?? 1;
                            const endAngle = completeness * 2 * Math.PI;
                            return arcGenerator({ startAngle: 0, endAngle: endAngle });
                        })
                        .style("pointer-events", "none");
        simulationBeeswarm.nodes(answersObjects);
        simulationBeeswarm.alpha(1).restart();
    }
    d3.selectAll(".checkbox-question").property("checked", true);
}

function createAttributeView(){
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
    for (const key of attributesOrderBeeswarm) {
        const value = questions[key];
        let answersObjects = answers[key].map((d, index) => ({ category: d,
                                                               value: 1 - individualMissingCounts[index] / totalAttributes,
                                                               id: answers['id'][index],
                                                               key: answers[keyAttribute][index] }));
        let options = value.options.map(d => d.toString());
        createQuestionBeeswarm(options, answersObjects, number, key);
        number++;
    }
}


d3.json("/attributes_items").then(data => {
    questions = data.attributes;
    attributesChecked = new Set(Object.keys(questions));
    attributesOrderBeeswarm = data.attributesOrder;
    answers = data.items;

    const heightAttributeOverview = (Object.keys(questions).length) * (heightQuestion + 0.1* heightBeeswarm)
    const heightBeeswarmSVG = heightAttributeOverviewHeader + heightAttributeOverviewLabels + heightAttributeOverview;
    beeswarmSVG.attr("height", heightBeeswarmSVG);

    createAttributeView();
});
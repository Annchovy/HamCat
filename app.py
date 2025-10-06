import pandas as pd
import json

from collections import defaultdict
from flask import Flask, render_template, jsonify, request
from typing import Optional

#FILE_RESPONSES = 'data/didactics/didactics_responses_2025_09_09'
#FILE_QUESTIONS = 'data/didactics/didactics_questions_2025_09_09.json'

FILE_RESPONSES = 'data/dummy_data/dummy_answers_h1'
FILE_QUESTIONS = 'data/dummy_data/dummy_questions.json'

#IDs have to be consecutive numbers [0, N], where N+1 is the number of entries
DF = pd.read_csv(FILE_RESPONSES, header=0, dtype=str)
DF = DF.fillna('')
COLUMNS = [column for column in DF.columns if column not in ['id', 'ID', 'Age']]

#ID_COLUMN = 'id'
#DF.rename({ID_COLUMN: 'id'}, inplace=True)

with open(FILE_QUESTIONS) as f:
    ATTRIBUTES_DESCRIPTION = json.load(f)

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


def calculate_nodes(columns) -> dict:
    df = DF.groupby(columns)['id'].apply(list).reset_index(name='ids')
    df['count'] = df['ids'].apply(len)
    return df.to_dict(orient='index')


def get_differences(values1: list, values2: list, attributes: list, attribute_description: dict) -> list:
    """
        Function for finding differences in answers for Hamming distances.
    """
    differences = []
    for i in range(len(values1)):
        attribute = attributes[i]
        options_categories = attribute_description[attribute]['options_categories']
        value1, value2 = str(values1[i]), str(values2[i])
        if value1 != value2 and options_categories[value1] != options_categories[value2]:
            differences.append(attribute)
    return differences


def check_grouping(question1: str, question2: str) -> Optional[str]:
    question_info_1 = ATTRIBUTES_DESCRIPTION[question1]
    question_info_2 = ATTRIBUTES_DESCRIPTION[question2]
    if 'group' not in question_info_1 or 'group' not in question_info_2:
        return None
    if question_info_1['group'] == question_info_2['group']:
        return question_info_1['group']
    return None


def calculate_graph(nodes: dict, attribute_description: dict) -> tuple:
    """
        Function for calculating a graph. Returns the graph's edges
        and its nodes grouped based on the belonging to the same question group.
    """
    n, edges = len(nodes), defaultdict(dict)
    groupings = defaultdict(dict)
    attributes = [a for a in nodes[0].keys() if a not in ['ids', 'count']]

    for i in range(n):
        values1 = [nodes[i][a] for a in attributes]

        for j in range(i + 1, n):
            values2 = [nodes[j][a] for a in attributes]
            differences = get_differences(values1, values2, attributes, attribute_description)
            edges[i][j] = differences
            if len(differences) == 2:
                group = check_grouping(*differences)
                if group:
                    groupings[i][j] = group

    return edges, groupings


@app.route('/extract_graph')
def extract_graph():
    nodes = calculate_nodes(COLUMNS)
    edges, groupings = calculate_graph(nodes, ATTRIBUTES_DESCRIPTION)
    return jsonify({'nodes': nodes,
                    'edges': edges,
                    'groupings': groupings,
                    'attributesOrder': list(ATTRIBUTES_DESCRIPTION.keys())})


@app.route('/recalculate_graph', methods=['POST'])
def recalculate_graph():
    data = request.get_json()
    if 'attributes' in data:
        attributes = data.get('attributes')
        nodes = calculate_nodes(attributes)
        edges, groupings = calculate_graph(nodes, ATTRIBUTES_DESCRIPTION)
    elif 'attribute_description' in data:
        attribute_description = data.get('attribute_description')
        nodes = calculate_nodes(COLUMNS)
        edges, groupings = calculate_graph(nodes, attribute_description)
    return jsonify({'nodes': nodes, 'edges': edges, 'groupings': groupings})


@app.route('/attributes_items')
def extract_attributes_items():
    df_dict = DF.to_dict(orient='list')
    return jsonify({'attributes': ATTRIBUTES_DESCRIPTION,
                    'items': df_dict,
                    'attributesOrder': list(ATTRIBUTES_DESCRIPTION.keys())})


if __name__ == '__main__':
    app.run(debug=True)

import pandas as pd
import json

from collections import defaultdict
from flask import Flask, render_template, jsonify, request
from dr_methods import apply_dimensionality_reduction, transform_ndarray

DF = pd.read_csv('./data/dummy_data/dummy_answers', header=0)
COLUMNS = [column for column in DF.columns if column != 'id']
#ID_COLUMN = 'id'
#DF.rename({ID_COLUMN: 'id'}, inplace=True)

with open('./data/dummy_data/dummy_questions.json') as f:
    ATTRIBUTES_DESCRIPTION = json.load(f)

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


def calculate_nodes(columns) -> dict:
    df = DF.groupby(columns)['id'].apply(list).reset_index(name='ids')
    df['count'] = df['ids'].apply(len)
    return df.to_dict(orient='index')


def get_differences(values1: list, values2: list, attributes: list) -> list:
    """
        Function for finding differences in answers for Hamming distances.
    """
    differences = []
    for i in range(len(values1)):
        if values1[i] != values2[i]:
            differences.append(attributes[i])
    return differences


def calculate_graph(nodes: dict) -> tuple:
    n, edges = len(nodes), defaultdict(dict)
    nodes_grouped = defaultdict(dict)
    attributes = [a for a in nodes[0].keys() if a not in ['ids', 'count']]

    for i in range(n):
        values1 = [nodes[i][a] for a in attributes]

        for j in range(i + 1, n):
            values2 = [nodes[j][a] for a in attributes]
            differences = get_differences(values1, values2, attributes)
            edges[i][j] = differences

            if len(differences) == 1:
                question = differences[0]
                question_info = ATTRIBUTES_DESCRIPTION[question]
                if "group" in question_info:
                    nodes_grouped[i][j] = ATTRIBUTES_DESCRIPTION[question]['group']
    return edges, nodes_grouped


@app.route('/extract_graph')
def extract_graph():
    nodes = calculate_nodes(COLUMNS)
    edges, nodes_grouped = calculate_graph(nodes)
    return jsonify({'nodes': nodes, 'edges': edges})


@app.route('/recalculate_graph', methods=['POST'])
def recalculate_graph():
    data = request.get_json()
    attributes = data.get('attributes')
    nodes = calculate_nodes(attributes)
    edges, nodes_grouped = calculate_graph(nodes)
    return jsonify({'nodes': nodes, 'edges': edges})


@app.route('/attributes_items')
def extract_attributes_items():
    df_dict = DF.to_dict(orient='list')
    return jsonify({'attributes': ATTRIBUTES_DESCRIPTION, 'items': df_dict})


if __name__ == '__main__':
    app.run(debug=True)

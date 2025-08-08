import pandas as pd
import json

from collections import defaultdict
from flask import Flask, render_template, jsonify, request
from dr_methods import apply_dimensionality_reduction, transform_ndarray

DF = pd.read_csv('./data/dummy_data/dummy_answers', header=0)
#ID_COLUMN = 'id'
#DF.rename({ID_COLUMN: 'id'}, inplace=True)

with open('./data/dummy_data/dummy_questions.json') as f:
    QUESTIONS_DESCRIPTION = json.load(f)

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


def calculate_nodes() -> dict:
    columns = [column for column in DF.columns if column != 'id']
    df = DF.groupby(columns)['id'].apply(list).reset_index(name='ids')
    df['count'] = df['ids'].apply(len)
    return df.to_dict(orient='index')


def calculate_hamming_distance(values1: list, values2: list) -> int:
    distance = 0
    for i in range(len(values1)):
        if values1[i] != values2[i]:
            distance += 1
    return distance


def calculate_graph(nodes: dict) -> dict:
    n, graph = len(nodes), defaultdict(dict)
    columns = [c for c in nodes[0].keys() if c not in ['ids', 'count']]
    for i in range(n):
        values1 = [nodes[i][c] for c in columns]
        for j in range(i + 1, n):
            values2 = [nodes[j][c] for c in columns]
            graph[i][j] = calculate_hamming_distance(values1, values2)
    return graph


@app.route('/extract_graph')
def extract_graph():
    nodes = calculate_nodes()
    edges = calculate_graph(nodes)
    return jsonify({'nodes': nodes, 'edges': edges, 'groups': QUESTIONS_DESCRIPTION['groups']})


@app.route('/questions_answers')
def extract_questions_answers():
    df_dict = DF.to_dict(orient='list')
    return jsonify({'questions': QUESTIONS_DESCRIPTION['questions'], 'answers': df_dict})


if __name__ == '__main__':
    app.run(debug=True)

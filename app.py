import pandas as pd
import json
import numpy as np

from collections import defaultdict, deque
from flask import Flask, render_template, jsonify, request
from typing import Optional

#FILE_RESPONSES = 'data/didactics/didactics_responses_2025_09_09'
#FILE_QUESTIONS = 'data/didactics/didactics_questions_2025_09_09.json'

DATASET_NAME = 'dummy_answers_h1'
FILE_RESPONSES = f'data/dummy_data/{DATASET_NAME}'
FILE_QUESTIONS = 'data/dummy_data/dummy_questions.json'

#IDs have to be consecutive numbers [0, N], where N+1 is the number of entries
DF_ORIGINAL = pd.read_csv(FILE_RESPONSES, header=0, dtype=str)
#ID_ORIGINAL = 'id'
#DF_ORIGINAL.rename(columns={ID_ORIGINAL: 'id_original'}, inplace=True)
COLUMNS = [column for column in DF_ORIGINAL.columns if column not in ['id', 'ID', 'Age', 'count']]


def split_dataset(df: pd.DataFrame, columns: list) -> tuple:
    rows_with_missing = df.fillna(np.nan).isnull().any(axis=1)
    df_with_missing, df_without_missing = df[rows_with_missing], df[~rows_with_missing]
    df_with_missing = df_with_missing.fillna('')
    missingness = (df_with_missing[columns] == '').sum(axis=1) / len(columns)
    df_with_missing['missingness'] = missingness
    return df_with_missing, df_without_missing


DF_WITH_MISSING, DF_WITHOUT_MISSING = split_dataset(DF_ORIGINAL, COLUMNS)

with open(FILE_QUESTIONS) as f:
    ATTRIBUTES_DESCRIPTION = json.load(f)

#ID_COLUMN = 'id'
#DF.rename({ID_COLUMN: 'id'}, inplace=True)


def calculate_missingness(df: pd.DataFrame, attributes: dict) -> pd.DataFrame:
    columns = list(attributes.keys())
    df = df.fillna('').groupby(columns)['id'].apply(list).reset_index(name='ids')
    df['count'] = df['ids'].apply(len)
    missingness = (df[columns] == '').sum(axis=1) / len(columns)
    df['missingness'] = missingness
    return df


def consider_all_categories(row: pd.Series, attribute: str, attributes: dict) -> list:
    rows = []
    categories = attributes[attribute]["options"]
    for category in categories:
        row[attribute] = str(category)
        rows.append(row.copy())
    return rows


def calculate_probable_nodes_per_row(row_missing: pd.Series, attributes: dict) -> tuple:
    rows_probable = deque([row_missing])
    attributes_missing = [attribute for attribute in attributes.keys() if row_missing[attribute] == '']
    probability_accumulated = 1
    for attribute in attributes_missing:
        n = len(rows_probable)
        for i in range(n):
            row = rows_probable.popleft()
            rows = consider_all_categories(row, attribute, attributes)
            rows_probable.extend(rows)
        probability_accumulated *= 1 / len(attributes[attribute]['options'])
    df = pd.DataFrame(rows_probable)
    df['missing_attributes'] = [attributes_missing] * len(df)
    return df, probability_accumulated


def calculate_probable_nodes(df: pd.DataFrame, attributes: dict) -> pd.DataFrame:
    df = calculate_missingness(df, attributes)
    dfs_probable = []
    for i, row in df.iterrows():
        df, probability = calculate_probable_nodes_per_row(row, attributes)
        df["probability"] = probability
        dfs_probable.append(df)
    df_probable = pd.concat(dfs_probable, axis=0)
    return df_probable


DF_PROBABLE = calculate_probable_nodes(DF_WITH_MISSING, ATTRIBUTES_DESCRIPTION)


app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


def calculate_nodes(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    if columns:
        df = df.groupby(columns)['id'].apply(list).reset_index(name='ids')
        df['count'] = df['ids'].apply(len)
    else:
        df = pd.DataFrame({
            'ids': [df['id'].tolist()],
            'count': [len(df)]
        })
    return df


def get_differences(values1: list, values2: list, attributes: list, attribute_description: dict) -> list:
    """
        Function for finding differences in answers for Hamming distances.
    """
    differences = []
    for i in range(len(values1)):
        attribute = attributes[i]
        options_categories = attribute_description[attribute]['options_categories']
        value1, value2 = str(values1[i]), str(values2[i])
        if not value1 or not value2 or options_categories[value1] != options_categories[value2]:
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


def calculate_graph(nodes: dict, attributes: list, attribute_description: dict) -> tuple:
    """
        Function for calculating a graph. Returns the graph's edges
        and its nodes grouped based on the belonging to the same question group.
    """
    n, edges = len(nodes), defaultdict(dict)
    groupings = defaultdict(dict)

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
    nodes = calculate_nodes(DF_WITHOUT_MISSING, COLUMNS).to_dict(orient='index')
    edges, groupings = calculate_graph(nodes, COLUMNS, ATTRIBUTES_DESCRIPTION)
    return jsonify({'name': DATASET_NAME,
                    'nodes': nodes,
                    'edges': edges,
                    'groupings': groupings,
                    'attributesOrder': list(ATTRIBUTES_DESCRIPTION.keys())})


def build_info(row):
    return {
        'missingness': row['missingness'],
        'probability': row['probability'],
        'missing_attributes': row['missing_attributes'],
        'ids': row['ids']
    }

@app.route('/recalculate_graph', methods=['POST'])
def recalculate_graph():
    data = request.get_json()
    attributes = data.get('attributes') if 'attributes' in data else COLUMNS
    attribute_description = data.get('attribute_description') if 'attribute_description' in data else ATTRIBUTES_DESCRIPTION

    df = calculate_nodes(DF_WITHOUT_MISSING, attributes)
    if 'missingness' in data and data.get('missingness') > 0:
        missingness = data.get('missingness')
        df['missingness'] = 0
        df['probability'] = 1
        df['missing_attributes'] = ''
        attributes_probable = attributes + ['missingness', 'probability', 'missing_attributes', 'ids', 'count']
        df_probable = DF_PROBABLE[DF_PROBABLE['missingness'] <= missingness][attributes_probable]
        df = pd.concat([df, df_probable])
        df['grouped_info'] = df.apply(build_info, axis=1)
        df = df.groupby(attributes).agg(grouped_info=('grouped_info', list), count=('count', 'sum')).reset_index()

    nodes = df.to_dict(orient='index')
    edges, groupings = calculate_graph(nodes, attributes, attribute_description)
    return jsonify({'nodes': nodes, 'edges': edges, 'groupings': groupings})


@app.route('/extract_probable_nodes', methods=['POST'])
def extract_probable_nodes():
    data = request.get_json()
    missingness = data.get('missingness')
    df = DF_PROBABLE[DF_PROBABLE['missingness'] <= missingness]
    return jsonify({'nodesProbable': df.reset_index(drop=True).to_dict(orient='index')})


@app.route('/attributes_items_with_missing', methods=['POST'])
def extract_attributes_items_with_missing():
    data = request.get_json()
    missingness = data.get('missingness')
    df_with_missing = DF_WITH_MISSING[DF_WITH_MISSING['missingness'] <= missingness]
    df_with_missing = df_with_missing.drop(['missingness'], axis=1)
    df = pd.concat([DF_WITHOUT_MISSING, df_with_missing]).reset_index()
    df_dict = df.to_dict(orient='list')
    return jsonify({'items': df_dict})


@app.route('/attributes_items')
def extract_attributes_items():
    df_dict = DF_WITHOUT_MISSING.to_dict(orient='list')
    return jsonify({'attributes': ATTRIBUTES_DESCRIPTION,
                    'items': df_dict,
                    'attributesOrder': list(ATTRIBUTES_DESCRIPTION.keys())})


if __name__ == '__main__':
    app.run(debug=True, port=5001)

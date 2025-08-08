import umap
import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.manifold import MDS


def apply_pca(df: pd.DataFrame) -> list:
    pca = PCA(n_components=2)
    results = pca.fit_transform(df)
    return results


def apply_tsne(df: pd.DataFrame, perplexity: int = 10) -> list:
    tsne = TSNE(n_components=2, perplexity=perplexity, random_state=42)
    results = tsne.fit_transform(df)
    return results


def apply_umap(df: pd.DataFrame) -> list:
    umap_model = umap.UMAP()
    results = umap_model.fit_transform(df)
    return results


def apply_mds(df: pd.DataFrame) -> list:
    mds = MDS(n_components=2, n_init=1)
    results = mds.fit_transform(df)
    return results


def apply_dimensionality_reduction(df: pd.DataFrame, method: str) -> np.array:
    if method == 'PCA':
        return apply_pca(df)
    elif method == 't-SNE':
        return apply_tsne(df)
    elif method == 'UMAP':
        return apply_umap(df)
    elif method == 'MDS':
        return apply_mds(df)
    else:
        return np.empty(0)


def transform_ndarray(array: np.array) -> list:
    result = []
    for i in range(array.shape[0]):
        result.append({'dim1': float(array[i][0]), 'dim2': float(array[i][1])})
    return result

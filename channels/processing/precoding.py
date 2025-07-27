import numpy as np

def transform_precoding(x: np.ndarray, rows: int, cols: int, coef: int):
    grouped = x.reshape((rows, cols))
    y = np.zeros_like(x, dtype=complex)

    for l in range(grouped.shape[0]):
        fft = np.fft.fft(grouped[l])
        y[l * cols : (l + 1) * cols] = coef * fft

    return y
import numpy as np

def zcsequnce(u, seq_length, q = 0):
    assert np.gcd(seq_length, u) == 1

    cf = seq_length % 2
    n = np.arange(seq_length)
    x = np.exp(-1j * ((np.pi * u * n * (n + cf + 2*q)) / seq_length))

    return x

print(zcsequnce(1, 5))
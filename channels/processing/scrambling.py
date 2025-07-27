import math
import matplotlib.pyplot as plt
from sequence.pseudo_random import get_pseudorandom_sequence

def scramble(b, c_init, Nc=1600):
    sequence_length = len(b)
    c = get_pseudorandom_sequence(c_init, sequence_length, Nc)
    b_hat = [(b[i] + c[i]) % 2 for i in range(len(b))]
    return b_hat

if __name__ == "__main__":
    b = [0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1]
    RNTI = 5
    q = 0
    N_cell_id = 133
    n_s = 0
    Nc = 1600
    c_init = RNTI * (2 ** 14) + q * (2 ** 13) + math.floor(n_s / 2) * (2 ** 9) + N_cell_id
    print(scramble(b, c_init))
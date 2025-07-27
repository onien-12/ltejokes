import math
import matplotlib.pyplot as plt

def get_scrambling_sequence(c_init, sequence_length, Nc=1600):
    c_init_binary = bin(c_init)[2:].rjust(32, "0") 

    c = [0] * sequence_length
    x_1 = [0] * (32 + Nc + sequence_length)
    x_2 = [0] * (32 + Nc + sequence_length)

    x_1[0] = 1
    x_1[30] = 0

    for i, bit in enumerate(c_init_binary):
        x_2[i] = int(bit)

    for n in range(Nc + sequence_length):
        x_1[n + 31] = (x_1[n + 3] + x_1[n]) % 2
        x_2[n + 31] = (x_2[n + 3] + x_2[n + 2] + x_2[n + 1] + x_2[n]) % 2

    for n in range(sequence_length):
        c[n] = (x_1[n + Nc] + x_2[n + Nc]) % 2

    return c

def scramble(b, c_init, Nc=1600):
    sequence_length = len(b)
    c = get_scrambling_sequence(c_init, sequence_length, Nc)
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
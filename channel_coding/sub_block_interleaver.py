import numpy as np

PERMUTATION_PATTERN = [1, 17, 9, 25, 5, 21, 13, 29, 3, 19, 11, 27, 7, 23, 15, 31,
                       0, 16, 8, 24, 4, 20, 12, 28, 2, 18, 10, 26, 6, 22, 14, 30]

def interleave(elements: list, null=None):
    D = len(elements)
    C_cc_subblock = 32
    R_cc_subblock = (D // C_cc_subblock) + 1
    dummy_bits = R_cc_subblock * C_cc_subblock - D

    y = [null] * dummy_bits + elements
    y = np.array(y, dtype=object).reshape(R_cc_subblock, C_cc_subblock)
    y_permuted = y[:, PERMUTATION_PATTERN]

    return y_permuted.flatten(order="F").tolist()

if __name__ == "__main__":
    print(interleave([1, 2, 3, 4, 5, 6, 7, 8, 9] * 9))
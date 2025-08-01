import numpy as np
from sequence.pseudo_random import get_pseudorandom_sequence

def get_rs_sequence(c_init, length):
    c = get_pseudorandom_sequence(c_init, 2*length)
    return [ 
        (1/np.sqrt(2)) * (1 - 2 * c[2*m]) + 1j * (1/np.sqrt(2)) * (1 - 2 * c[2*m + 1])
        for m in range(length)
    ]
import numpy as np
from channels.processing.precoding import transform_precoding
from sequence.pseudo_random import get_pseudorandom_sequence
from .processing import modulation 

class InputBit:
    value: int

    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return f"{self.__class__.__name__}({self.value})"
    def __str__(self):
        return f"{self.__class__.__name__}({self.value})"

class PlaceholderBit(InputBit): pass
class PlaceholderRepetitionBit(InputBit): pass
class DataBit(InputBit): pass

codebook_2_antenna = {
    1: [
        1/np.sqrt(2) * np.array([[1, 1]]).T,
        1/np.sqrt(2) * np.array([[1, -1]]).T,
        1/np.sqrt(2) * np.array([[1, 1j]]).T,
        1/np.sqrt(2) * np.array([[1, -1j]]).T,
        1/np.sqrt(2) * np.array([[1, 0]]).T,
        1/np.sqrt(2) * np.array([[0, 1]]).T,
    ],
    2: [
        1/np.sqrt(2) * np.array([
            [1, 0],
            [0, 1]
        ]),
    ]
}

def scramble(bits: list[InputBit], q: int, n_rnti: int, N_Cell_id: int, n_s: int):
    c_init = n_rnti * (2 ** 14) + q * (2 ** 13) + int(np.floor(n_s / 2)) * (2 ** 9) + N_Cell_id
    c = get_pseudorandom_sequence(c_init, len(bits))
    b_hat = [0] * len(bits)

    for i in range(len(bits)):
        bit = bits[i]
        if isinstance(bit, PlaceholderBit):
            b_hat[i] = 1
        else:
            if isinstance(bit, PlaceholderRepetitionBit):
                b_hat[i] = b_hat[i - 1]
            else:
                b_hat[i] = (bit.value + c[i]) % 2

    return b_hat

if __name__ == "__main__":
    bits = [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0] * 4
    for i, b in enumerate(bits):
        if i < 3: bits[i] = PlaceholderBit(b)
        if 3 <= i < 6: bits[i] = PlaceholderRepetitionBit(b)
        if i >= 6: bits[i] = DataBit(b)

    q = 0
    n_rnti = 2
    N_cell_id = 133
    n_s = 0
    M_pusch_sc = 4
    v = 1
    codebook_index = 0
    
    scrambled = scramble(bits, q, n_rnti, N_cell_id, n_s)
    modulated = modulation.modulate_bits(scrambled, mu=4)
    layer_mapped = modulated
    transform_precoded = transform_precoding(layer_mapped, 
                                             len(layer_mapped) // M_pusch_sc, M_pusch_sc, 
                                             1 / np.sqrt(M_pusch_sc))
    
    precoded = codebook_2_antenna[v][codebook_index] @ np.array([[transform_precoded]])

    print(precoded)
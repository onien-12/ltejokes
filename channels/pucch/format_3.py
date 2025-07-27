import numpy as np
from ..processing import modulation, scrambling
from ..processing.precoding import transform_precoding
from .common import get_n_cell_cs

N_PUCCH_seq = 12
N_RB_sc = 12
N_UL_symb = 7

class Context:
    def __init__(self, N_RS_ID: int, is_shortened: bool, allocated_prb: int):
        self.N_RS_ID = N_RS_ID
        self.is_shortened = is_shortened
        self.allocated_prb = allocated_prb

        self.N_PUCCH_SF_0 = 5
        self.N_PUCCH_SF_1 = 4 if is_shortened else 5

orth_exp_code = lambda code: [np.exp(1j * 2 * c * np.pi / 5) for c in code]

orthogonal_codes = [
    {
        5: np.array([1, 1, 1, 1, 1]),
        4: np.array([1, 1, 1, 1])
    },
    {
        5: np.array(orth_exp_code([0, 1, 2, 3, 4])),
        4: np.array([1, -1, 1, -1])
    },
    {
        5: np.array(orth_exp_code([0, 2, 4, 1, 3])),
        4: np.array([1, 1, -1, -1])
    },
    {
        5: np.array(orth_exp_code([0, 3, 1, 4, 2])),
        4: np.array([1, -1, -1, 1])
    },
    {
        5: np.array(orth_exp_code([0, 4, 3, 2, 1]))
    }
]

def get_y_n(d, n_s, l_start, context: Context):
    total_rbs = context.N_PUCCH_SF_0 + context.N_PUCCH_SF_1
    y = np.zeros((total_rbs, N_RB_sc), dtype=complex)

    for i in range(N_RB_sc):
        for n in range(total_rbs):
            l = l_start + n
            n_bar = n % context.N_PUCCH_SF_0
            n_cell_cs = get_n_cell_cs(n_s, l, context.N_RS_ID, N_UL_symb)
            phase = np.exp(1j * np.pi * np.floor(n_cell_cs / 64) / 2)
            n_oc_0 = context.allocated_prb % context.N_PUCCH_SF_1
            if n < context.N_PUCCH_SF_0:
                y[n, i] = orthogonal_codes[n_oc_0][context.N_PUCCH_SF_1][n_bar] * phase * d[i]
            else:
                n_oc_1 = ((3 * n_oc_0) if context.N_PUCCH_SF_1 == 5 else n_oc_0) % context.N_PUCCH_SF_1
                y[n, i] = orthogonal_codes[n_oc_1][context.N_PUCCH_SF_1][n_bar] * phase * d[i + N_RB_sc]
    
    return y


def cyclic_shift(y: np.ndarray, n_s: int, l_start: int, context: Context):
    total_rbs = context.N_PUCCH_SF_0 + context.N_PUCCH_SF_1
    tilde_y = np.zeros_like(y)

    for i in range(N_RB_sc):
        for n in range(total_rbs):
            n_cell_cs = get_n_cell_cs(n_s, l_start + n, context.N_RS_ID, N_UL_symb)
            tilde_y[n, i] = y[n, i] * ((i + n_cell_cs) % N_RB_sc)

    return tilde_y

if __name__ == "__main__":
    def to_bits(n: int, length: int):
        binary = bin(n)[2:].rjust(length, "0")
        return [int(b) for b in binary]

    N_cell_id = 133
    n_rnti = 9
    context = Context(
        N_RS_ID=N_cell_id,
        is_shortened=False,
        allocated_prb=0
    )
    n_s = 0
    l = 0
    antenna_ports = 1
    bits = [
        *to_bits(5, 8),
        *to_bits(99, 8),
        *to_bits(72, 8),
        *to_bits(65, 8),
        *to_bits(162, 8),
        *to_bits(243, 8),
    ]

    c_init = (int(np.floor(n_s / 2)) + 1) * (2 * N_cell_id + 1) * (2 ** 16) + n_rnti

    scrambled = scrambling.scramble(bits, c_init)
    modulated = modulation.modulate_bits(bits, mu=2)
    orthogonal_spread = get_y_n(modulated, n_s, l, context)
    cyclic_shifted = cyclic_shift(orthogonal_spread, n_s, l, context)
    precoded = transform_precoding(cyclic_shifted, context.N_PUCCH_SF_0 + context.N_PUCCH_SF_1, N_RB_sc, 1 / np.sqrt(antenna_ports * N_RB_sc))

    print(precoded)
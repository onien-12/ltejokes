import numpy as np
from ..processing import modulation, scrambling
from ..processing.precoding import transform_precoding
from .format_4 import Context

N_PUCCH_seq = 12
N_RB_sc = 12
N_UL_symb = 7
N_PUCCH_SF = 2

orthogonal_codes = [
    [1] * 12,
    [1] * 6 + [-1] * 6
]

def block_wise_spread(d: np.ndarray, n_oc, context: Context):
    y = np.zeros((context.N_PUCCH_0 + context.N_PUCCH_1, N_RB_sc), dtype=complex)
    for n in range(y.shape[0]):
        for i in range(N_RB_sc):
            y[n, i] = orthogonal_codes[n_oc][i] * d[int((i + n * N_RB_sc) / N_PUCCH_SF)]
    return y

if __name__ == "__main__":
    N_cell_id = 133
    n_rnti = 9
    context = Context(
        N_RS_ID=N_cell_id,
        is_shortened=False,
        is_extended_cp=False,
        M_PUCCH4_RB=1
    )
    n_s = 0
    l = 0
    n_oc = 0
    M_bit = N_RB_sc * (context.N_PUCCH_0 + context.N_PUCCH_1)
    bits = np.random.binomial(1, 0.5, size=(M_bit))

    c_init = (int(np.floor(n_s / 2)) + 1) * (2 * N_cell_id + 1) * (2 ** 16) + n_rnti

    scrambled = scrambling.scramble(bits, c_init)
    modulated = modulation.modulate_bits(bits, mu=2)
    spread = block_wise_spread(modulated, n_oc, context)
    precoded = transform_precoding(spread, context.N_PUCCH_0 + context.N_PUCCH_1, N_RB_sc, 1 / np.sqrt(context.M_PUCCH4_SC))

    print(precoded)
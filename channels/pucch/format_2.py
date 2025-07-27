import numpy as np
from ..processing import modulation, scrambling
from sequence.rs_sequence import generate_rs_sequence
from .common import get_n_cell_cs

N_PUCCH_seq = 12
N_RB_sc = 12
N_UL_symb = 7

class Context:
    def __init__(self, N_RS_ID: int, cqi_pucch_resourceIndex: int, nRB_CQI: int, nCS_AN: int):
        self.N_RS_ID = N_RS_ID
        self.cqi_pucch_resourceIndex = cqi_pucch_resourceIndex
        self.nRB_CQI = nRB_CQI
        self.nCS_AN = nCS_AN

def get_n_p(n_s, context: Context):
    is_in_region = context.cqi_pucch_resourceIndex < N_RB_sc * context.nRB_CQI
    if n_s % 2 == 0:
        if is_in_region: return context.cqi_pucch_resourceIndex % N_RB_sc
        return (context.cqi_pucch_resourceIndex + context.nCS_AN + 1) % N_RB_sc
    
    if is_in_region:
        return ((N_RB_sc * (get_n_p(n_s - 1, context) + 1)) % (N_RB_sc + 1)) - 1
    return (N_RB_sc - context.cqi_pucch_resourceIndex - 2) % N_RB_sc

def get_n_cs(n_s, l, context: Context):
    n_cell_cs = get_n_cell_cs(n_s, l, context.N_RS_ID)
    return (n_cell_cs + get_n_p(n_s, context)) % N_RB_sc

def get_alpha(n_s, l, context: Context):
    return 2 * np.pi * get_n_cs(n_s, l, context) / N_RB_sc

def cyclic_shift(d, n_s, l_start, antenna_ports, context: Context):
    zeta = np.zeros((10, N_RB_sc), dtype=complex)
    for n in range(10):
        for i in range(N_RB_sc):
            l = l_start + n
            rs_sequence = generate_rs_sequence(N_PUCCH_seq, get_alpha(n_s, l, context), 0)
            zeta[n, i] = (1 / np.sqrt(antenna_ports)) * d[n] * rs_sequence[i]
    return zeta

if __name__ == "__main__":
    N_cell_id = 133 
    context = Context(
        N_RS_ID=N_cell_id,
        cqi_pucch_resourceIndex=0,
        nRB_CQI=5,
        nCS_AN=6
    )
    n_s = 0
    l = 0
    n_rnti = 8

    bits = [0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]
    
    c_init = (int(np.floor(n_s / 2)) + 1) * (2 * N_cell_id + 1) * (2 ** 16) + n_rnti
    scrambled = scrambling.scramble(bits, c_init)
    modulated = modulation.modulate_bits(scrambled, mu=2)
    zeta = cyclic_shift(modulated, n_s, l, 1, context)
    print(zeta)
    
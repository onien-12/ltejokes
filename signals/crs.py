from context.context import Context
from .common import get_rs_sequence
from context.constants import N_max_DL_RB
from channels.symbol import ReferenceSignal

crs_sequences = {}

def generate_crs_sequence(n_s, l, context: Context):
    N_cp = 0 if context.is_extended_cp else 1
    c_init = (2**10) * (7 * (n_s + 1) + l + 1) * (2 * context.physical_cell_id + 1) + 2 * context.physical_cell_id + N_cp 
    return get_rs_sequence(c_init, 2 * N_max_DL_RB)

def get_crs_sequence(n_s, l, context: Context):
    crs_sequence = crs_sequences.get((n_s, l), None)
    if not crs_sequence:
        crs_sequence = generate_crs_sequence(n_s, l, context)
        crs_sequences[(n_s, l)] = crs_sequence
    return crs_sequence

def get_subcarrier_shift_v(antenna_port, l, n_s):
    if (antenna_port == 0 and l == 0) or (antenna_port == 1 and l != 0): return 0
    if (antenna_port == 0 and l != 0) or (antenna_port == 1 and l == 0): return 3
    if antenna_port == 2: return 3 * (n_s % 2)
    if antenna_port == 3: return 3 + 3 * (n_s % 2)

def map_crs(antenna_port: int, context: Context):
    possible_l = [1] if antenna_port in (2, 3) else [0, context.N_DL_symb - 3]
    for n_s in range(context.nof_slots):
        for l in possible_l:
            for m in range(2 * context.N_DL_RB):
                crs_sequence = get_crs_sequence(n_s, l, context)
                m_tick = m + N_max_DL_RB - context.N_DL_RB
                v_shift = context.physical_cell_id % 6
                v = get_subcarrier_shift_v(antenna_port, l, n_s)
                k = 6*m + (v + v_shift) % 6
                current_symb = crs_sequence[m_tick]
                context.dl_resource_grid.map_re(antenna_port, k, n_s * context.N_DL_symb + l, ReferenceSignal(current_symb))
import numpy as np
from sequence.rs_sequence import generate_rs_sequence
from channels.pucch.common import get_n_cell_cs

N_PUCCH_seq = 12
N_RB_sc = 12
N_UL_symb = 7
N_PUCCH_SF = 4

modulation_tables = {
    "a": {
        (0): 1, (1): -1
    },
    "b": {
        (0, 0): 1, (0, 1): -1j,
        (1, 0): 1j, (1, 1): -1
    }
}

orthogonal_codes = {
    4: [
        np.array([1, 1, 1, 1]),
        np.array([1, -1, 1, -1]),
        np.array([1, -1, -1, 1]),
    ],
    3: [
        np.array([1, 1, 1]),
        np.array([1, np.exp(1j * 2 * np.pi / 3), np.exp(1j * 4 * np.pi / 3)]),
        np.array([1, np.exp(1j * 4 * np.pi / 3), np.exp(1j * 2 * np.pi / 3)]),
    ]
}


class Context:
    allocated_n_pucch: int
    N_cs: int
    delta_pucch_shift: int
    is_extended_cp: bool
    N_RS_ID: int

    def __init__(self, allocated_n_pucch, N_cs, delta_pucch_shift, is_extended_cp, N_RS_ID):
        self.allocated_n_pucch = allocated_n_pucch
        self.N_cs = N_cs
        self.delta_pucch_shift = delta_pucch_shift
        self.is_extended_cp = is_extended_cp
        self.N_RS_ID = N_RS_ID

def modulate(bits, format="a"):
    return modulation_tables[format][tuple(bits)]

def cyclic_shift(symb, alpha, antenna_ports):
    '''
     * symb specifies the modulated symbol "d(0)"
     * alpha specifies the cyclic shift for rs sequence
     * antenna_ports specifies the number of antenna ports "P"
    '''
    y = [0] * N_PUCCH_seq
    rs_sequence = generate_rs_sequence(N_PUCCH_seq, alpha, 0)

    for n in range(N_PUCCH_seq):
        y[n] = (1 / np.sqrt(antenna_ports)) * symb * rs_sequence[n]
    
    return y

def get_scrambling(n_s, context: Context):
    return 1 if get_n_p(n_s, context) % 2 == 0 else np.exp(1j * np.pi / 2)

def get_orthogonal_code(n_s, context: Context):
    return orthogonal_codes[N_PUCCH_SF][get_n_oc(n_s, context)]

def get_c(context: Context):
    return 3 if not context.is_extended_cp else 2

def get_cyclic_shift_resources(context: Context):
    total_cyclic_shifts = get_c(context) * context.N_cs / context.delta_pucch_shift
    is_in_orthogonal_resource = context.allocated_n_pucch < total_cyclic_shifts

    return (total_cyclic_shifts, is_in_orthogonal_resource)

def get_resource_N(context: Context):
    '''
     - generates N' for the current context
    '''
    _, is_in_orth_res = get_cyclic_shift_resources(context)
    return context.N_cs if is_in_orth_res else N_RB_sc

def get_n_p(n_s, context: Context):
    d = 2 if not context.is_extended_cp else 0
    c = get_c(context)
    total_cyclic_shifts, is_in_orthogonal_resource = get_cyclic_shift_resources(context)
    N = get_resource_N(context)

    if n_s % 2 == 0:
        if is_in_orthogonal_resource: return context.allocated_n_pucch
        return (context.allocated_n_pucch - total_cyclic_shifts) % total_cyclic_shifts
    
    h_p = (get_n_p(n_s - 1, context) + d) % total_cyclic_shifts
    if is_in_orthogonal_resource:
        return np.floor(h_p / c) + (N * (h_p % c) / context.delta_pucch_shift)
    
    return ((c * (get_n_p(n_s - 1, context) + 1)) % (total_cyclic_shifts + 1)) - 1

def get_n_oc(n_s, context: Context):
    multiplier = 1 if not context.is_extended_cp else 2
    return int(np.floor(get_n_p(n_s, context) * context.delta_pucch_shift / get_resource_N(context))) * multiplier

def get_n_cs(n_s, l, context: Context):
    n_cell_cs = get_n_cell_cs(n_s, l, context.N_RS_ID, N_UL_symb)
    n_p = get_n_p(n_s, context)
    n_oc = get_n_oc(n_s, context)
    N = get_resource_N(context)

    if not context.is_extended_cp:
        return (n_cell_cs + (n_p * context.delta_pucch_shift + (n_oc % context.delta_pucch_shift)) % N) % N_RB_sc

    return (n_cell_cs + (n_p * context.delta_pucch_shift + n_oc // 2) % N) % N_RB_sc

def get_alpha(n_s, l, context: Context):
    return 2 * np.pi * get_n_cs(n_s, l, context) / N_RB_sc

def modify_y(y, n_s, context: Context):
    zeta = [0] * (N_PUCCH_seq * N_PUCCH_SF * 2)
    for m_tick in range(2):
        for m in range(N_PUCCH_SF):
            for n in range(N_PUCCH_seq):
                orthogonal_code = get_orthogonal_code(n_s, context)
                value = get_scrambling(n_s, context) * orthogonal_code[m] * y[n]
                zeta[m_tick * N_PUCCH_SF * N_PUCCH_seq + m * N_PUCCH_seq + n] = value
    return zeta

if __name__ == "__main__":
    context = Context(
        allocated_n_pucch=3,
        N_cs=5,
        delta_pucch_shift=2,
        is_extended_cp=False,
        N_RS_ID=133
    )
    n_s = 0
    l = 0
    P = 1
    bits = (0, 1)

    modulated = modulate(bits, "b")
    alpha = get_alpha(n_s, l, context)
    y = cyclic_shift(modulated, alpha, 1)
    zeta = modify_y(y, n_s, context)

    print(zeta)
import scrambling

def get_n_cell_cs(n_s, l, N_RS_ID, N_UL_symb=7):
    sequence = scrambling.get_scrambling_sequence(N_RS_ID, 8 * (N_UL_symb * n_s + l + 1))
    return sum([sequence[8 * N_UL_symb * n_s + 8 * l + i] * (2 ** i) for i in range(7)])
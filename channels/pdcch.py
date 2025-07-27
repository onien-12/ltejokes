import numpy as np
from channel_coding.sub_block_interleaver import interleave
from channels.symbol import ReferenceSignal, PDCCH, Reserved
from .processing import modulation, scrambling

NIL = (0, 0, 0, 0)

def cyclic_shift(elements: list, cell_id: int):
    result = [0] * len(elements)
    for i in range(len(elements)):
        result[i] = elements[(i + cell_id) % len(elements)]
    return result

def is_reg_complete(resource_grid: np.ndarray, k_start: int, l: int) -> bool:
    available = 0
    k = k_start
    while k < resource_grid.shape[0] and available < 4:
        if not isinstance(resource_grid[k, l], ReferenceSignal):
            available += 1
        k += 1
    return available == 4

def map_reg(resource_grid: np.ndarray, elements: list, k_start: int, l: int):
    i = 0
    k = k_start
    while i < 4 and k < resource_grid.shape[0]:
        if not isinstance(resource_grid[k, l], ReferenceSignal):
            resource_grid[k, l] = elements[i]
            i += 1
        k += 1

def map_quadruplets(resource_grid: np.ndarray, quadruplets: list, N_DL_RB: int, N_RB_sc: int, PDCCH_OFDM_symbols: int):
    m = 0
    k = 0
    while True:
        l = 0
        while True:
            can_be_assigned = k % 4 == 0 and is_reg_complete(resource_grid, k, l)
            if can_be_assigned:
                map_reg(resource_grid, list(quadruplets[m]), k, l)
                m += 1
            l += 1
            if l >= PDCCH_OFDM_symbols:
                break
        k += 1
        if k >= N_DL_RB * N_RB_sc:
            break

if __name__ == "__main__":    
    N_DL_RB = 15
    N_RB_sc = 12
    RE_in_frame = 140
    n_s = 0
    N_cell_id = 133
    PDCCH_OFDM_symbols = 1
    resource_grid = np.zeros((N_DL_RB * N_RB_sc, RE_in_frame), dtype=object)
    bits = list(np.random.binomial(1, 0.5, size=(72)))
    c_init = int(np.floor(n_s / 2)) * (2 ** 9) + N_cell_id

    required_bits = 2 * PDCCH_OFDM_symbols * N_DL_RB * N_RB_sc
    append_bits = required_bits - len(bits)
    for _ in range(append_bits // len(NIL)):
        bits.extend(NIL)

    scrambled_bits = scrambling.scramble(bits, c_init)
    modulated_symbols = modulation.modulate_bits(scrambled_bits, mu=2)
    precoded = modulated_symbols
    quadruplets = precoded.reshape((len(precoded) // 4, 4))
    interleaved = [symb for symb in interleave(list(quadruplets)) if not (symb is None)]
    shifted = [
        [PDCCH(v) for v in q]
        for q in cyclic_shift(interleaved, N_cell_id)
    ]

    for k in range(N_DL_RB * N_RB_sc):
        prb_sc = k % N_RB_sc
        if prb_sc == 5 or prb_sc == 11:
            resource_grid[k, 0] = ReferenceSignal(0)

    map_quadruplets(resource_grid, shifted, N_DL_RB, N_RB_sc, PDCCH_OFDM_symbols)
    for row in resource_grid:
        print(row[0])

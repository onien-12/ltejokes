import numpy as np
from ..processing import modulation, scrambling
from ..processing.precoding import transform_precoding

N_PUCCH_seq = 12
N_RB_sc = 12
N_UL_symb = 7

class Context:
    def __init__(self, N_RS_ID: int, is_shortened: bool, is_extended_cp: bool, M_PUCCH4_RB: int):
        self.N_RS_ID = N_RS_ID
        self.is_shortened = is_shortened
        self.is_extended_cp = is_extended_cp
        self.M_PUCCH4_RB = M_PUCCH4_RB
        self.M_PUCCH4_SC = M_PUCCH4_RB * N_RB_sc

        if is_extended_cp and not is_shortened: self.N_PUCCH_0 = self.N_PUCCH_1 = 5
        if is_extended_cp and is_shortened: 
            self.N_PUCCH_0 = 5 
            self.N_PUCCH_1 = 4
        
        if not is_extended_cp and not is_shortened: self.N_PUCCH_0 = self.N_PUCCH_1 = 6
        if not is_extended_cp and is_shortened:
            self.N_PUCCH_0 = 0
            self.N_PUCCH_1 = 5

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
    M_bit = context.M_PUCCH4_RB * N_RB_sc * (context.N_PUCCH_0 + context.N_PUCCH_1) * 2
    bits = np.random.binomial(1, 0.5, size=(M_bit))

    c_init = (int(np.floor(n_s / 2)) + 1) * (2 * N_cell_id + 1) * (2 ** 16) + n_rnti

    scrambled = scrambling.scramble(bits, c_init)
    modulated = modulation.modulate_bits(bits, mu=2)
    precoded = transform_precoding(modulated, context.N_PUCCH_0 + context.N_PUCCH_1, context.M_PUCCH4_SC, 1 / np.sqrt(context.M_PUCCH4_SC))

    print(precoded)
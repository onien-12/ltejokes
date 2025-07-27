import numpy as np
from context.context import Context
from context.constants import N_RB_sc

class ResourceGrid:
    def __init__(self, is_downlink: bool, context: Context):
        bw = context.N_DL_RB if is_downlink else context.N_UL_RB
        symb = context.N_DL_symb if is_downlink else context.N_UL_symb
        self.q = [np.array((bw * N_RB_sc, symb * context.nof_slots), dtype=object) for _ in range(context.antenna_ports)]

    def map_re(self, port: int, k: int, l: int, symb: complex):
        self.q[port][k, l] = symb
import numpy as np
from typing import TYPE_CHECKING
from context.constants import N_RB_sc
from .debug_tools import ResourceGridDebug
from ...symbol import Symbol, Unassigned

if TYPE_CHECKING:
    from context.context import Context

class ResourceGrid:
    def __init__(self, is_downlink: bool, context: "Context"):
        bw = context.N_DL_RB if is_downlink else context.N_UL_RB
        symb = context.N_DL_symb if is_downlink else context.N_UL_symb
        self.q = [
            np.full((bw * N_RB_sc, symb * context.nof_slots), Unassigned(0), dtype=Symbol) 
            for _ in range(context.antenna_ports)
        ]
        self.context = context
        self.debug = ResourceGridDebug(self)

    def map_re(self, port: int, k: int, l: int, symb: complex):
        self.q[port][k, l] = symb

    def __repr__(self):
        return f"ResourceGrid(ports={len(self.q)}, k={self.q[0].shape[0]}, l={self.q[0].shape[1]})"

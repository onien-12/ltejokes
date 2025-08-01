import numpy as np
from typing import Optional
from dataclasses import dataclass
from .sib2 import SIB2Context
from channels.processing.resource_grid.resource_grid import ResourceGrid

@dataclass
class Context:
    sib2: SIB2Context

    is_extended_cp: bool
    physical_cell_id: int
    antenna_ports: int

    N_DL_RB: int # downlink bandwidth expressed in multiples of N^{RB}_{sc}
    N_UL_RB: int # uplink bandwidth expressed in multiples of N^{RB}_{sc}

    dl_resource_grid: Optional[ResourceGrid] = None
    ul_resource_grid: Optional[ResourceGrid] = None

    nof_slots: int = 20 # number of slots in a frame

    def __post_init__(self):
        # number of OFDM or SC-FDMA symbols in slot
        self.N_UL_symb = self.N_DL_symb = 6 if self.is_extended_cp else 7
        self.init_resource_grid()

    def init_resource_grid(self):
        self.dl_resource_grid = ResourceGrid(is_downlink=True, context=self)
        self.ul_resource_grid = ResourceGrid(is_downlink=False, context=self)
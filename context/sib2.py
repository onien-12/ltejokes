from dataclasses import dataclass
from typing import Union

@dataclass
class PUCCHConfig:
    delta_pucch_shift: int
    n_RB_CQI: int
    n_CS_AN: int

@dataclass
class PUSCHConfig:
    class HoppingMode:
        inter_subframe = 0
        intra_subframe = 1

    n_SB: int
    hopping_mode: HoppingMode
    hopping_offset: int
    is_64QAM_enabled: bool

@dataclass
class SIB2Context:
    pucch_config: PUCCHConfig
    pusch_config: PUSCHConfig
from timeit_decorator import timeit_sync
import matplotlib.pyplot as plt
from context import context, sib2
from essentials.debug_tools import plot_constellation, plot_resource_grid
import signals.crs

enb = context.Context(
    sib2=sib2.SIB2Context(
        pucch_config=sib2.PUCCHConfig(
            delta_pucch_shift=2,
            n_RB_CQI=1,
            n_CS_AN=0,
        ),
        pusch_config=sib2.PUSCHConfig(
            n_SB=1,
            hopping_mode=sib2.PUSCHConfig.HoppingMode.inter_subframe,
            hopping_offset=0,
            is_64QAM_enabled=True
        )
    ),
    is_extended_cp=False,
    physical_cell_id=0,
    antenna_ports=1,
    N_DL_RB=5,
    N_UL_RB=5
)

@timeit_sync(runs=1)
def process(enb: context.Context):
    for antenna_port in range(enb.antenna_ports):
        signals.crs.map_crs(antenna_port, enb)

process(enb)
for antenna_port in range(enb.antenna_ports):
    plot_resource_grid(enb.dl_resource_grid, antenna_port)

print(enb)
plt.show()
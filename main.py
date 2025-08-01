from timeit_decorator import timeit_sync
import matplotlib.pyplot as plt
from context import context, sib2
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
    N_DL_RB=50,
    N_UL_RB=50
)

@timeit_sync(runs=1)
def process(antenna_port: int, enb: context.Context):
    signals.crs.map_crs(antenna_port, enb)

process(0, enb)
print(enb)
plt.imshow(enb.dl_resource_grid.debug.visualize_img(0))
plt.show()
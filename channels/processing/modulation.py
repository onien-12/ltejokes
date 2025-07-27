import math
import matplotlib.pyplot as plt
import numpy as np

def generate_qam_16():
    # taken from 36.211, table 7.1.3-1 (16 QAM modulation mapping)
    # https://www.etsi.org/deliver/etsi_ts/136200_136299/136211/15.02.00_60/ts_136211v150200p.pdf
    qam_table = {
        (0, 0, 0, 0): complex(1/math.sqrt(10), 1/math.sqrt(10)),
        (0, 0, 0, 1): complex(1/math.sqrt(10), 3/math.sqrt(10)),
        (0, 0, 1, 0): complex(3/math.sqrt(10), 1/math.sqrt(10)),
        (0, 0, 1, 1): complex(3/math.sqrt(10), 3/math.sqrt(10))
    }

    # from the same table, when the first bit is 1, the real 
    # part of the complex number is negated
    # when the second bit is 1, the imaginary part is negated
    # here, we just generate the table
    for i in range(4, 16):
        bits = tuple([int(n) for n in list(np.binary_repr(i).rjust(4, "0"))])
        iq_mapped = qam_table[(0, 0, bits[2], bits[3])]
        i = iq_mapped.real
        q = iq_mapped.imag

        if bits[0] == 1:
            i = -i
        if bits[1] == 1:
            q = -q
        
        qam_table[bits] = complex(i, q)

    return qam_table

def generate_qpsk():
    return {
        (0, 0): complex(1 / math.sqrt(2), 1 / math.sqrt(2)),
        (0, 1): complex(1 / math.sqrt(2), -1 / math.sqrt(2)),
        (1, 0): complex(-1 / math.sqrt(2), 1 / math.sqrt(2)),
        (1, 1): complex(-1 / math.sqrt(2), -1 / math.sqrt(2)),
    }

# mu: table
modulation_tables = {
    4: generate_qam_16(),
    2: generate_qpsk()
}

def modulate_bits(bits: list[int], mu: int):
    if len(bits) % 4 != 0: return None
    qam_table = modulation_tables[mu]

    arr = np.array(bits).reshape(len(bits) // mu, mu)
    modulated = np.array([qam_table[tuple(bs)] for bs in arr])
    return modulated.transpose()

# for bits, mapping in qam_table.items():
#     plt.plot(mapping.real, mapping.imag, "bo")
#     plt.text(mapping.real, mapping.imag + 0.2, str(bits), ha="center")

# plt.grid(True)
# plt.xlim((-4, 4)); plt.ylim((-4, 4))
# plt.xlabel("Real"); plt.ylabel("Imag")
# plt.title("16 QAM")
# plt.show()
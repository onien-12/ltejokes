import numpy as np
import matplotlib.pyplot as plt
from modulation import qam_table

U_matrices = {
    2: (1 / np.sqrt(2)) * np.array([
        [1,          1         ],
        [1, np.exp(-1j * np.pi)]
    ]),
    3: (1 / np.sqrt(3)) * np.array([
        [1, 1, 1],
        [1, np.exp(-1j * 2 * np.pi / 3), np.exp(-1j * 4 * np.pi / 3)],
        [1, np.exp(-1j * 4 * np.pi / 3), np.exp(-1j * 8 * np.pi / 3)],
    ]),
    4: (1 / 2) * np.array([
        [1, 1, 1, 1],
        [1, np.exp(-1j * 2 * np.pi / 4), np.exp(-1j * 4 * np.pi / 4), np.exp(-1j * 6 * np.pi / 4)],
        [1, np.exp(-1j * 4 * np.pi / 4), np.exp(-1j * 8 * np.pi / 4), np.exp(-1j * 12 * np.pi / 4)],
        [1, np.exp(-1j * 6 * np.pi / 4), np.exp(-1j * 12 * np.pi / 4), np.exp(-1j * 18 * np.pi / 4)],
    ])
}

D_matrices = {
    2: np.array([
        [1, 0],
        [0, np.exp(-1j * 2 * np.pi / 2)]
    ]),
    3: np.array([
        [1, 0, 0],
        [0, np.exp(-1j * 2 * np.pi / 3), 0],
        [0, 0, np.exp(-1j * 4 * np.pi / 3)],
    ]),
    4: np.array([
        [1, 0, 0, 0],
        [0, np.exp(-1j * 2 * np.pi / 4), 0, 0],
        [0, 0, np.exp(-1j * 4 * np.pi / 4), 0],
        [0, 0, 0, np.exp(-1j * 6 * np.pi / 4)],
    ])
}

codebook_1 = [
    {
        1: (1 / np.sqrt(2)) * np.array([[1], [1]]),
        2: (1 / np.sqrt(2)) * np.array([
            [1, 0],
            [0, 1]
        ])
    },
    {
        1: (1 / np.sqrt(2)) * np.array([[1], [-1]]),
        2: (1 / np.sqrt(2)) * np.array([
            [1, 1],
            [1, -1]
        ])
    },
    {
        1: (1 / np.sqrt(2)) * np.array([[1], [1j]]),
        2: (1 / np.sqrt(2)) * np.array([
            [1, 1],
            [1j, -1j]
        ])
    },
    {
        1: (1 / np.sqrt(2)) * np.array([[1], [-1j]]),
    }
]

M_layer_symb = 64
v = 2
P = 2

num_bits = v * M_layer_symb * 4  
bitstream = np.random.randint(0, 2, num_bits)
symbols = []
for i in range(0, len(bitstream), 4):
    bits = tuple(bitstream[i:i+4])
    symbols.append(qam_table[bits])

x = np.array(symbols).reshape(v, M_layer_symb)

W = codebook_1[0][v] 
D = D_matrices[v]
U = U_matrices[v]

y = W @ D @ U @ x

print(y)

fig, axs = plt.subplots(1, 2, figsize=(12, 5))

# Original x (input)
axs[0].scatter(x[0].real, x[0].imag, color='blue', label='Layer 0')
axs[0].scatter(x[1].real, x[1].imag, color='orange', label='Layer 1')
axs[0].set_title('Original signal')
axs[0].grid(True)
axs[0].set_xlabel('In-phase (I)')
axs[0].set_ylabel('Quadrature (Q)')
axs[0].legend()
axs[0].axhline(0, color='black', lw=0.5)
axs[0].axvline(0, color='black', lw=0.5)

# Output y (after precoding)
axs[1].scatter(y[0].real, y[0].imag, label='Port 0')
axs[1].scatter(y[1].real, y[1].imag, label='Port 1')
axs[1].set_title('Constellation After Large Delay CDD')
axs[1].grid(True)
axs[1].set_xlabel('In-phase (I)')
axs[1].set_ylabel('Quadrature (Q)')
axs[1].legend()
axs[1].axhline(0, color='black', lw=0.5)
axs[1].axvline(0, color='black', lw=0.5)

plt.tight_layout()
plt.show()


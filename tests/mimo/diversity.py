import numpy as np
import matplotlib.pyplot as plt

M_layer_symb = 8
x = (np.random.rand(M_layer_symb*2) + 1j * np.random.rand(M_layer_symb*2)).reshape(2, M_layer_symb)
precoding = (1 / np.sqrt(2)) * np.array([
    [1,  0,  1j,   0],
    [0, -1,  0,   1j],
    [0,  1,  0,   1j],
    [1,  0,  -1j,  0]
])
y = np.zeros((2, 2 * M_layer_symb), dtype=complex)

for i in range(M_layer_symb):
    precoded = precoding @ np.array([
        x[0][i].real,
        x[1][i].real,
        x[0][i].imag,
        x[1][i].imag
    ])
    y[0, 2*i]     = precoded[0]
    y[1, 2*i]     = precoded[1]
    y[0, 2*i + 1] = precoded[2]
    y[1, 2*i + 1] = precoded[3]

plt.figure(figsize=(6, 6))
plt.scatter(y[0].real, y[0].imag, c='blue', label='Antenna port 0')
plt.scatter(y[1].real, y[1].imag, c='red', label='Antenna port 1')
plt.axhline(0, color='gray', lw=0.5)
plt.axvline(0, color='gray', lw=0.5)
plt.grid(True, linestyle='--', alpha=0.6)
plt.gca().set_aspect('equal')
plt.xlabel('In-phase')
plt.ylabel('Quadrature')
plt.title('Precoded Constellation Diagram')
plt.legend()
plt.tight_layout()
plt.show()

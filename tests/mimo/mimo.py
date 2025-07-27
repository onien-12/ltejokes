import numpy as np

n_stream = 4
tx_ant = 4
rx_ant = 2

s = (np.random.rand(n_stream) + 1j * np.random.rand(n_stream)).reshape(n_stream, 1)
H = (np.random.randn(rx_ant, tx_ant) + 1j*np.random.randn(rx_ant, tx_ant)) / np.sqrt(2)

print(s)

U, Sigma, Vh = np.linalg.svd(H)
V = np.matrix(Vh).H
Uh = np.matrix(U).H

print(Uh)

Sigma_diag = np.diag(Sigma)

x = V @ s 
y = Uh @ (H @ x)
recovered = np.linalg.inv(Sigma_diag) @ y

print(recovered)
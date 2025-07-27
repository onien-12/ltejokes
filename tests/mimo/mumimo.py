import numpy as np

rx_users = [4, 2, 1, 1, 3]
rx_ant = sum(rx_users)
tx_ant = 12
n_stream = rx_ant

s = (np.random.rand(n_stream) + 1j * np.random.rand(n_stream)).reshape(n_stream, 1)
H = (np.random.randn(rx_ant, tx_ant) + 1j*np.random.randn(rx_ant, tx_ant)) / np.sqrt(2)

print(f"{s=}")

def extract(H, rx_ant, prev_rx_ant):
    Hi = H[prev_rx_ant:prev_rx_ant + rx_ant, :]
    Hi_rank = np.linalg.matrix_rank(Hi)
    our_indexes = [i for i in range(prev_rx_ant, prev_rx_ant + rx_ant)]
    H_other_i = np.delete(H, our_indexes, 0)
    H_other_rank = np.linalg.matrix_rank(H_other_i)
    U_other, Sig_other, V_H_other = np.linalg.svd(H_other_i)
    Vhn = V_H_other[H_other_rank:, :]
    Vn = np.matrix(Vhn).H
    Pi = Vn @ np.matrix(Vn).H
    Ui, Sigi, Vhi = np.linalg.svd(Hi @ Pi)
    print(f"{rx_ant=} {Hi_rank=} {H_other_rank=}")
    return Ui, Sigi, Vhi, H_other_rank, Hi, Hi_rank

def process(H, rx_users):
    prev_rx_ant = 0
    F = []
    D = []
    Hs = []
    Sig = []

    for rx_ant in rx_users:
        Ui, Sigi, Vhi, H_other_rank, Hi, Hi_rank = extract(H, rx_ant, prev_rx_ant)
        S = Vhi[:Hi_rank, :]

        F.append(np.matrix(S).H)
        D.append(np.matrix(Ui).H)
        Sig.append(np.diag(Sigi))
        Hs.append(Hi)

        prev_rx_ant += rx_ant

    return F, D, Hs, Sig

F, D, Hs, Sig = process(H, rx_users)
FF = np.hstack(F)
FF = FF[:, :n_stream]
x = FF @ s

received = []
for i, H_i in enumerate(Hs):
    yi = D[i] @ (H_i @ x)
    received.append(yi)

for i, yi in enumerate(received):
    recovered_symbol = np.linalg.inv(Sig[i]) @ yi
    print(f"Recovered signal at User {i} (yr_{i}):", recovered_symbol)
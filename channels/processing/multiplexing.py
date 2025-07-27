import numpy as np
import matplotlib.pyplot as plt
import math
import modulation

n_subc = 64
cp = int(n_subc * 0.25)
n_pilot = 8
pilot_value = 1
carrier_freq = 10000000
sampling_rate = 20000000
t_samp = 1 / sampling_rate

data_carriers_len = n_subc - n_pilot
bits_per_carrier = modulation.mu * data_carriers_len

# generates indices of all subcarriers from 0 to n_subc - 1
carriers = np.arange(n_subc)

# only the pilot carriers
# so we take each n_subc//n_pilot subcarrier
pilot_carriers = carriers[::n_subc//n_pilot]

# deleting all pilot carriers to get
# only the data carriers
data_carriers = np.delete(carriers, pilot_carriers)

bits = np.random.binomial(n=1, p=0.5, size=(bits_per_carrier))

# reshaping an array of bytes to send a QAM symbol on 
# each subcarrier
sp = bits.reshape((data_carriers_len, modulation.mu))
mapped = np.array([modulation.qam_table[tuple(b)] for b in sp])

symbol = np.zeros(n_subc, dtype=complex)
symbol[pilot_carriers] = pilot_value
symbol[data_carriers] = mapped

symbol_time = np.fft.ifft(symbol)
cp_sym = symbol_time[-cp:]
symbol_cp = np.hstack([cp_sym, symbol_time])

# Upconversion taken from 36.211 15.2.0 6.13 (p. 180) (figure 6.13-1)
real_symbol = [np.real(symbol_cp[idx]) * math.cos(2 * math.pi * carrier_freq * idx * t_samp) -
               np.imag(symbol_cp[idx]) * math.sin(2 * math.pi * carrier_freq * idx * t_samp)
               for idx in range(len(symbol_cp))]

plt.figure(figsize=(8, 2))
plt.plot(real_symbol, label="Passband signal")
plt.legend(fontsize=10)
plt.xlabel("Time"); plt.ylabel("Amplitude")
plt.grid(True)
plt.show()
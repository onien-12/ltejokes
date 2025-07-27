import numpy as np
import modulation

symbols = modulation.modulate_bits([0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1])
d = np.array([ symbols ])

def mapping_dimension(v, q):
    return ((v // q), v - (v // q))

def layer_mapper(d, v):
    dimension = mapping_dimension(v, len(d))
    M_layer_symb = len(d[0]) // dimension[0]
    x = [
        [0] * M_layer_symb
        for _ in range(v)
    ]

    for layer in range(v):
        current_codeword = 0 if layer < dimension[0] else 1
        current_mod = dimension[0] if layer < dimension[0] else dimension[1]
        for i in range(M_layer_symb):
            x[layer][i] = d[current_codeword][current_mod * i + layer]
            print(current_mod)

    return x

print(d)
print(layer_mapper(d, 3))
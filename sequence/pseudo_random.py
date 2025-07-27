def get_pseudorandom_sequence(c_init, sequence_length, Nc=1600):
    c_init_binary = bin(c_init)[2:].rjust(32, "0") 

    c = [0] * sequence_length
    x_1 = [0] * (32 + Nc + sequence_length)
    x_2 = [0] * (32 + Nc + sequence_length)

    x_1[0] = 1
    x_1[30] = 0

    for i, bit in enumerate(c_init_binary):
        x_2[i] = int(bit)

    for n in range(Nc + sequence_length):
        x_1[n + 31] = (x_1[n + 3] + x_1[n]) % 2
        x_2[n + 31] = (x_2[n + 3] + x_2[n + 2] + x_2[n + 1] + x_2[n]) % 2

    for n in range(sequence_length):
        c[n] = (x_1[n + Nc] + x_2[n + Nc]) % 2

    return c
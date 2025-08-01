class Symbol:
    value: complex
    color: tuple[int, int, int]

    def __init__(self, value: complex):
        self.value = value

    def __repr__(self):
        return f"{self.__class__.__name__}({self.value})"
    def __str__(self):
        return f"{self.__class__.__name__}({self.value})"

class Unassigned(Symbol): color = (40, 40, 40)
class ReferenceSignal(Symbol): color = (255, 0, 0)
class PDCCH(Symbol): color = (0, 255, 0)
class Reserved(Symbol): color = (102, 102, 102)
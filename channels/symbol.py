class Symbol:
    value: complex

    def __init__(self, value: complex):
        self.value = value

    def __repr__(self):
        return f"{self.__class__.__name__}({self.value})"
    def __str__(self):
        return f"{self.__class__.__name__}({self.value})"

class ReferenceSignal(Symbol): pass
class PDCCH(Symbol): pass
class Reserved(Symbol): pass
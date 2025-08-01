import numpy as np
from context.constants import N_RB_sc
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .resource_grid import ResourceGrid

class ResourceGridDebug:
    RECT_SIZE = 10

    def __init__(self, rg: "ResourceGrid"):
        self.rg = rg

    def visualize_img(self, port: int):
        grid = self.rg.q[port]  
        num_rows, num_cols = grid.shape
        cell_size = self.RECT_SIZE

        image_height = num_rows * (cell_size + 1) + 1
        image_width = num_cols * (cell_size + 1) + 1

        image = np.zeros((image_height, image_width, 3), dtype=np.uint8)

        for row in range(num_rows):
            for col in range(num_cols):
                top = row * (cell_size + 1) + 1
                left = col * (cell_size + 1) + 1

                color = grid[num_rows - row - 1, col].color  
                image[top:top + cell_size, left:left + cell_size] = color

        for col in range(0, num_cols, self.rg.context.N_DL_symb):
            image[:, col * (cell_size + 1)] = (255, 255, 255) 
        for row in range(0, num_rows, N_RB_sc):
            image[row * (cell_size + 1), :] = (255, 255, 255)

        image[-1, :] = (255, 255, 255)
        image[:, -1] = (255, 255, 255)

        return image
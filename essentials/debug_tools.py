from channels.processing.resource_grid.resource_grid import ResourceGrid
import matplotlib.pyplot as plt
import numpy as np

def plot_constellation(
    complex_points: list[complex] | np.ndarray,
    title: str = "Constellation Plot",
    xlabel: str = "In-phase (I)",
    ylabel: str = "Quadrature (Q)",
    grid: bool = True,
    aspect_ratio: str = 'equal',
    show_labels: bool = True,
    s: int = 20, 
    alpha: float = 0.7,
    color: str = 'blue',
) -> None:
    if not isinstance(complex_points, np.ndarray):
        complex_points = np.array(complex_points)

    if complex_points.size == 0:
        print("Warning: No complex points provided for constellation plot.")
        return

    real_parts = complex_points.real
    imag_parts = complex_points.imag

    plt.figure(figsize=(8, 8)) 
    plt.scatter(real_parts, imag_parts, s=s, alpha=alpha, color=color)

    plt.title(title)
    if show_labels:
        plt.xlabel(xlabel)
        plt.ylabel(ylabel)
    
    if grid:
        plt.grid(True)
    
    if aspect_ratio:
        plt.gca().set_aspect(aspect_ratio) 

    plt.axhline(0, color='gray', linestyle='--', linewidth=0.5)
    plt.axvline(0, color='gray', linestyle='--', linewidth=0.5)

def plot_resource_grid(resource_grid: ResourceGrid, antenna_port: int):
    plt.figure()
    plt.title(f"Resource Grid for antenna port {antenna_port}")
    plt.imshow(resource_grid.debug.visualize_img(antenna_port))
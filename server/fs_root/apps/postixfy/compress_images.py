import os
from PIL import Image


def convert_png_to_jpeg(folder):
    files = []

    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)

        if not os.path.isfile(file_path):
            continue

        if filename.lower().endswith(".png") or filename.lower().endswith(".jpeg"):
            base_name = os.path.splitext(filename)[0]
            new_file = os.path.join(folder, base_name + ".webp")

            with Image.open(file_path) as img:
                img.save(new_file, "WEBP", optimize=True, quality=80, method=6)

            print(f"Converted: {filename} -> {base_name}.webp")

            files.append(filename)
        else:
            continue

    return files


if __name__ == "__main__":
    import sys

    folder_path = sys.argv[1]
    files = convert_png_to_jpeg(folder_path)

    if input("Remove? ") == "y":
        for file in files:
            os.remove(os.path.join(folder_path, file))

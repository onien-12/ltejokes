import os
import json
import re
from pathlib import Path
from pydub import AudioSegment
from pydub.utils import mediainfo  # For mediainfo which can give duration
import eyed3


def sanitize_filename(name):
    """Sanitizes a string to be a valid filename."""
    return re.sub(r'[\\/:*?"<>|]', '', name).strip()


def format_time_hhmmss(seconds):
    """Formats seconds into HH:MM:SS or MM:SS."""
    seconds = int(seconds)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes:02d}:{seconds:02d}"


def extract_metadata_from_mp3(file_path):
    """
    Extracts ID3 metadata (title, artist, album art) and duration from an MP3 file using eyeD3 and pydub.
    Returns a dictionary of extracted data.
    """
    metadata = {
        'title': None,
        'author': None,
        'duration': None,
        'image_data': None,  # Raw image bytes
        'image_format': None,  # e.g., 'image/jpeg', 'image/png'
    }

    print(f"  Processing: {file_path.name}")

    # --- Extract duration using pydub's mediainfo ---
    try:
        info = mediainfo(str(file_path))
        if info and 'duration' in info:
            metadata['duration'] = float(info['duration'])
            print(f"    Duration: {format_time_hhmmss(metadata['duration'])}")
    except Exception as e:
        print(
            f"    Warning: Could not get duration from mediainfo for {file_path.name}: {e}")

    # --- Extract ID3 tags using eyeD3 ---
    try:
        audiofile = eyed3.load(str(file_path))  # eyeD3 loads the audio file
        file_name = os.path.basename(file_path)

        if audiofile and audiofile.tag:  # Check if tags exist
            if " - " in file_name:
                metadata['title'] = file_name.split(
                    '-')[1].strip().replace(".mp3", "").strip()
                metadata['author'] = file_name.split('-')[0].strip()
            else:
                if audiofile.tag.title:
                    metadata['title'] = audiofile.tag.title
                    print(f"    Title: {metadata['title']}")
                if audiofile.tag.artist:
                    metadata['author'] = audiofile.tag.artist
                    print(f"    Author: {metadata['author']}")

            # Extract album art (picture)
            print(audiofile.tag)
            if audiofile.tag.images:  # tag.images is a list of ImageFrame objects
                # Prioritize Front Cover image (type 3)
                picture = next((img for img in audiofile.tag.images if img.picture_type ==
                               eyed3.id3.frames.ImageFrame.FRONT_COVER), None)
                if not picture and audiofile.tag.images:  # Fallback to first available image
                    picture = audiofile.tag.images[0]

                if picture:
                    metadata['image_data'] = picture.image_data  # Raw bytes
                    # e.g., 'image/jpeg'
                    metadata['image_format'] = picture.mime_type
                    print(f"    Found embedded artwork ({picture.mime_type}).")
        else:
            print(f"    No ID3 tags found for {file_path.name}.")

    except Exception as e:
        print(f"    Error during eyeD3 read for {file_path.name}: {e}")

    return metadata


def process_mp3_directory(directory_path):
    """
    Scans a directory for MP3s, extracts metadata, saves images, and creates metadata.json.
    """
    root_path = Path(directory_path)
    if not root_path.is_dir():
        print(f"Error: Directory '{directory_path}' does not exist.")
        return

    output_metadata = {}
    images_dir = root_path / "images"
    os.makedirs(images_dir, exist_ok=True)  # Ensure images subdirectory exists

    # Get all MP3s, sorted for consistency
    mp3_files = sorted(list(root_path.glob("*.mp3")))

    if not mp3_files:
        print(f"No MP3 files found in '{directory_path}'.")
        return

    print(f"Scanning directory: {directory_path}")

    for mp3_file_path in mp3_files:
        file_name = mp3_file_path.name

        extracted_data = extract_metadata_from_mp3(mp3_file_path)

        song_metadata = {
            "author": extracted_data['author'] if extracted_data['author'] else "Unknown Artist",
            "title": extracted_data['title'] if extracted_data['title'] else file_name.replace(".mp3", "").strip(),
            "duration": format_time_hhmmss(extracted_data['duration']),
            "imagePath": None  # Will be set below if image exists
        }

        # --- Save album art ---
        if extracted_data['image_data']:
            image_extension = extracted_data['image_format'].split(
                '/')[-1] if extracted_data['image_format'] else "jpg"
            # Ensure unique filename for image using hash or simple counter if titles aren't unique
            # For simplicity, let's use a combination of sanitized title and a hash
            import hashlib
            image_hash = hashlib.md5(
                extracted_data['image_data']).hexdigest()[:8]
            image_title_for_filename = sanitize_filename(
                song_metadata['title'] or mp3_file_path.stem)

            image_file_name = f"{image_title_for_filename}_{image_hash}.{image_extension}"

            output_image_path = images_dir / image_file_name

            try:
                with open(output_image_path, 'wb') as img_file:
                    img_file.write(extracted_data['image_data'])

                # Store path relative to the *playlist directory* for client-side consumption
                # Stores as "images/filename.jpg"
                song_metadata['imagePath'] = str(
                    Path("images") / image_file_name)
                print(
                    f"    Artwork saved to: {output_image_path.relative_to(root_path)}")
            except Exception as e:
                print(f"    Error saving artwork for {file_name}: {e}")

        output_metadata[file_name] = song_metadata

    # --- Write metadata.json ---
    metadata_json_path = root_path / "metadata.json"
    try:
        with open(metadata_json_path, 'w', encoding='utf-8') as f:
            json.dump(output_metadata, f, indent=2, ensure_ascii=False)
        print(f"\nSuccessfully created metadata.json in '{root_path}'.")
    except Exception as e:
        print(f"Error writing metadata.json: {e}")


if __name__ == "__main__":
    target_directory = "lofi or just chill"
    process_mp3_directory(target_directory)

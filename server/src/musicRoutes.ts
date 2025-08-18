import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { Request, Response } from "express";
import crypto from "crypto";
import { formatTime } from "./utils";

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

//@ts-expect-error
interface MulterRequest extends Request {
  files?: {
    audioFile?: MulterFile[];
    iconFile?: MulterFile[];
    trackImageFile?: MulterFile[];
  };
  body: {
    title: string;
    author?: string;
    playlistName: string;
  };
}

const getAudioDuration = async (filePath: string, ffmpeg: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        console.error(`[Server] FFprobe error for ${filePath}:`, err);
        return reject(new Error(`FFprobe failed: ${err.message}`));
      }
      if (metadata && metadata.format && metadata.format.duration) {
        return resolve(parseFloat(metadata.format.duration));
      }
      return reject(new Error("Duration not found in metadata"));
    });
  });
};

export const handleMusicUpload = (baseFsRoot: string, ffmpeg: any) => async (req: MulterRequest, res: Response) => {
  const { title, author, playlistName } = req.body;
  const audioFile = req.files?.audioFile?.[0];
  const playlistIconFile = req.files?.iconFile?.[0];
  const trackImageFile = req.files?.trackImageFile?.[0];

  if (!audioFile || !title || !playlistName) {
    if (audioFile) await fs.unlink(audioFile.path);
    if (playlistIconFile) await fs.unlink(playlistIconFile.path);
    if (trackImageFile) await fs.unlink(trackImageFile.path);
    return res.status(400).json({ error: "Missing required fields: title, audioFile, playlistName." });
  }

  const playlistDir = path.join(baseFsRoot, "apps", "postixfy", playlistName);
  const audioFilePath = audioFile.path;

  try {
    const playlistDirExists = await fs
      .access(playlistDir)
      .then(() => true)
      .catch(() => false);

    if (!playlistDirExists && !playlistIconFile) {
      if (audioFile) await fs.unlink(audioFile.path);
      if (trackImageFile) await fs.unlink(trackImageFile.path);
      return res.status(400).json({ error: "Playlist icon is required when creating a new playlist." });
    }

    await fs.mkdir(playlistDir, { recursive: true });

    const audioFileName = `${title.replace(/[^a-zA-Z0-9_\-.]/g, "_")}.mp3`;
    const finalAudioPath = path.join(playlistDir, audioFileName);

    let durationSeconds: string | undefined;
    try {
      durationSeconds = formatTime(await getAudioDuration(audioFilePath, ffmpeg));
      console.log(`[Server] Detected duration for ${audioFile.originalname}: ${durationSeconds} seconds.`);
    } catch (ffprobeErr) {
      console.warn(`[Server] Could not get duration for ${audioFile.originalname} with ffprobe: ${ffprobeErr}`);
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(audioFilePath)
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .toFormat("mp3")
        .outputOptions(["-id3v2_version", "3"])
        .save(finalAudioPath)
        .on("end", () => {
          console.log(`[Server] Audio converted and saved: ${finalAudioPath}`);
          resolve();
        })
        .on("error", (err: any) => {
          console.error(`[Server] FFmpeg conversion error for ${audioFilePath}:`, err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        });
    });

    await fs.unlink(audioFilePath);

    if (playlistIconFile) {
      const finalIconPath = path.join(playlistDir, "icon.png");
      await fs.rename(playlistIconFile.path, finalIconPath);
    }

    let finalTrackIconPath: string | undefined;
    if (trackImageFile) {
      const iconExtension = path.extname(trackImageFile.originalname);
      const iconFileName = `icon_${crypto.randomUUID()}${iconExtension}`;
      await fs.mkdir(path.join(playlistDir, "images"), { recursive: true });

      finalTrackIconPath = path.join(playlistDir, "images", iconFileName);
      await fs.rename(trackImageFile.path, finalTrackIconPath);

      console.log(`[Server] Icon saved: ${finalTrackIconPath}`);
    }

    const metadataFilePath = path.join(playlistDir, "metadata.json");
    let metadata: {
      [key: string]: { author?: string; title?: string; imagePath?: string; duration?: string };
    } = {};

    try {
      const existingMetadata = await fs.readFile(metadataFilePath, "utf-8");
      metadata = JSON.parse(existingMetadata);
    } catch (readError: any) {
      if (readError.code !== "ENOENT") {
        console.warn(`[Server] Non-ENOENT error reading metadata.json for ${playlistName}:`, readError.message);
      }
    }

    metadata[audioFileName] = {
      author: author || "Unknown Author",
      title: title,
      imagePath: finalTrackIconPath ? path.relative(playlistDir, finalTrackIconPath).replace(/\\/g, "/") : undefined,
      duration: durationSeconds,
    };

    await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`[Server] metadata.json updated for ${playlistName}`);

    res.status(200).json({
      message: "Music uploaded and processed successfully!",
      song: {
        title,
        author,
        playlistName,
        audioFileName,
        iconPath: finalTrackIconPath ? path.relative(playlistDir, finalTrackIconPath).replace(/\\/g, "/") : undefined,
      },
    });
  } catch (err: any) {
    console.error(`[Server] Upload process failed:`, err);
    if (existsSync(audioFilePath)) {
      await fs
        .unlink(audioFilePath)
        .catch((cleanErr) => console.error("Failed to clean up temp audio file on error:", cleanErr));
    }
    res.status(500).json({ error: `Upload failed: ${err.message || "Unknown server error during processing."}` });
  }
};

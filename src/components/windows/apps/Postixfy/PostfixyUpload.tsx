import React, { useState, useCallback, useMemo, useRef } from "react";
import { ClipLoader } from "react-spinners";
import clsx from "clsx";
import axios from "axios";
import Input from "../../../utils/Input";
import Button from "../../../utils/Button";
import jsmediatags from "jsmediatags";
import { formatTime } from "./utils";

const UPLOAD_API_URL = "http://localhost:3001/api/apps/postixfy/upload";

interface PostixfyUploadProps {
  availablePlaylists?: { name: string; iconUrl: string | null }[];
  onUploadSuccess?: () => void;
}

const PostixfyUpload: React.FC<PostixfyUploadProps> = ({ availablePlaylists = [], onUploadSuccess }) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [playlistIconFile, setPlaylistIconFile] = useState<File | null>(null);

  const [trackImagePreviewUrl, setTrackImagePreviewUrl] = useState<string | null>(null);
  const [trackImageFile, setTrackImageFile] = useState<File | null>(null);

  const [selectedPlaylistOption, setSelectedPlaylistOption] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const playlistIconInputRef = useRef<HTMLInputElement>(null);
  const trackImageInputRef = useRef<HTMLInputElement>(null);

  const isCreatingNewPlaylist = useMemo(() => {
    return selectedPlaylistOption === "new";
  }, [selectedPlaylistOption]);

  const finalPlaylistName = useMemo(() => {
    return isCreatingNewPlaylist ? newPlaylistName.trim() : selectedPlaylistOption;
  }, [isCreatingNewPlaylist, newPlaylistName, selectedPlaylistOption]);

  const reset = () => {
    setTitle("");
    setAuthor("");
    setDetectedDuration(null);
    setTrackImageFile(null);
    setTrackImagePreviewUrl(null);
  };

  const handleAudioFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setUploadProgress(0);

      if (file.type.startsWith("audio/")) {
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            if (tag.tags.title) setTitle(tag.tags.title);
            if (tag.tags.artist) setAuthor(tag.tags.artist);
            if (tag.tags.picture) {
              const picture = tag.tags.picture;
              const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
              const imageFile = new File([blob], `album_art.${picture.format.split("/")[1] || "png"}`, {
                type: picture.format,
              });
              setTrackImageFile(imageFile);

              const reader = new FileReader();
              reader.onload = (event) => {
                setTrackImagePreviewUrl(event.target?.result as string);
              };
              reader.readAsDataURL(blob);
            }
            console.log("Detected ID3 Tags:", tag.tags);
          },
          onError: (error: any) => {
            console.warn("Error reading audio tags:", error.type, error.info);
            reset();
          },
        });
      } else {
        reset();
      }
    } else {
      setAudioFile(null);
      setUploadProgress(0);
      reset();
    }
  }, []);

  const handlePlaylistIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPlaylistIconFile(e.target.files[0]);
    }
  }, []);

  const handleTrackImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTrackImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setTrackImagePreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setTrackImageFile(null);
      setTrackImagePreviewUrl(null);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setUploadMessage(null);
      setIsError(false);
      setUploadProgress(0);

      if (!title.trim() || !audioFile || !finalPlaylistName) {
        setIsError(true);
        setUploadMessage("Song Title, Audio File, and Playlist Name are required.");
        setLoading(false);
        return;
      }
      if (isCreatingNewPlaylist && !playlistIconFile) {
        setIsError(true);
        setUploadMessage("Playlist icon is required when creating a new playlist.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("author", author.trim());
      formData.append("playlistName", finalPlaylistName);
      formData.append("audioFile", audioFile);
      if (playlistIconFile) {
        formData.append("iconFile", playlistIconFile);
      }
      if (trackImageFile) {
        formData.append("trackImageFile", trackImageFile);
      }

      try {
        const response = await axios.post(UPLOAD_API_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(progressEvent.loaded * 100);
              setUploadProgress(percentCompleted);
            } else {
              setUploadProgress(progressEvent.loaded > 0 ? 99 : 0);
            }
          },
        });

        const data = response.data;

        setIsError(false);
        setUploadMessage(data.message || "Upload successful!");
        setUploadProgress(100);

        reset();

        setAudioFile(null);
        setPlaylistIconFile(null);
        setSelectedPlaylistOption("");
        setNewPlaylistName("");

        if (audioFileInputRef.current) audioFileInputRef.current.value = "";
        if (playlistIconInputRef.current) playlistIconInputRef.current.value = "";
        if (trackImageInputRef.current) trackImageInputRef.current.value = "";

        if (onUploadSuccess) onUploadSuccess();
      } catch (err: any) {
        console.error("Upload error:", err);
        setIsError(true);
        if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.error) {
          setUploadMessage(err.response.data.error);
        } else {
          setUploadMessage(err.message || "An unexpected error occurred during upload.");
        }
        setUploadProgress(0);
      } finally {
        setLoading(false);
      }
    },
    [
      title,
      author,
      audioFile,
      playlistIconFile,
      trackImageFile,
      finalPlaylistName,
      isCreatingNewPlaylist,
      onUploadSuccess,
    ]
  );

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a] text-white p-6 rounded-lg overflow-y-auto">
      <h2 className="text-xl font-medium mb-4 text-white">Upload New Music</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 items-start w-full">
          <label htmlFor="audio-file" className="text-md text-gray-300 font-medium">
            Audio File:
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/*"
            onChange={handleAudioFileUpload}
            ref={audioFileInputRef}
            required
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#3a3a3a] file:text-white hover:file:bg-[#4a4a4a] file:cursor-pointer"
          />
          {audioFile && (
            <span className="text-xs text-gray-400">
              Selected: {audioFile.name} ({Math.round(audioFile.size / 1024 / 102.4) / 10} MB)
              {detectedDuration !== null && <span className="ml-2">Duration: {formatTime(detectedDuration)}</span>}
            </span>
          )}
        </div>

        <Input label="Song Title:" placeholder="e.g., Numa numa" value={title} onChange={setTitle} required />
        <Input label="Author (Optional):" placeholder="e.g., Beethoven" value={author} onChange={setAuthor} />

        <div className="flex flex-col gap-1 items-start w-full">
          <label htmlFor="playlist-select" className="text-md text-gray-300 font-medium">
            Select Playlist:
          </label>
          <select
            id="playlist-select"
            className="bg-[#2a2a2a] text-white border border-[#444] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5c5c5c] focus:border-[#5c5c5c] transition-all w-full"
            value={selectedPlaylistOption}
            onChange={(e) => setSelectedPlaylistOption(e.target.value)}
            required
          >
            <option value="" disabled>
              -- Choose or Create --
            </option>
            {availablePlaylists.map((pl) => (
              <option key={pl.name} value={pl.name}>
                {pl.name}
              </option>
            ))}
            <option value="new">-- Create New Playlist --</option>
          </select>
        </div>

        {isCreatingNewPlaylist && (
          <Input
            label="New Playlist Name:"
            placeholder="e.g., Upbeat"
            value={newPlaylistName}
            onChange={setNewPlaylistName}
            required
          />
        )}

        {isCreatingNewPlaylist && (
          <div className="flex flex-col gap-1 items-start w-full">
            <label htmlFor="playlist-icon-file" className="text-md text-gray-300 font-medium">
              Playlist Icon (Required for New Playlist):
            </label>
            <input
              id="playlist-icon-file"
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handlePlaylistIconUpload}
              required
              ref={playlistIconInputRef}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#3a3a3a] file:text-white hover:file:bg-[#4a4a4a] file:cursor-pointer"
            />
            {playlistIconFile && (
              <span className="text-xs text-gray-400">
                Selected: {playlistIconFile.name} ({Math.round(playlistIconFile.size / 1024)} KB)
              </span>
            )}
          </div>
        )}
        {!isCreatingNewPlaylist && selectedPlaylistOption && (
          <div className="text-xs text-gray-500">
            The song will be added to "{selectedPlaylistOption}". Existing playlist icon will be used.
          </div>
        )}

        <div className="flex flex-col gap-1 items-start w-full">
          <label htmlFor="track-image-file" className="text-md text-gray-300 font-medium">
            Track image:
          </label>
          <input
            id="track-image-file"
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleTrackImageUpload}
            ref={trackImageInputRef}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#3a3a3a] file:text-white hover:file:bg-[#4a4a4a] file:cursor-pointer"
          />
          {trackImagePreviewUrl && (
            <div className="mt-2 w-24 h-24 rounded-md overflow-hidden bg-gray-700 flex items-center justify-center border border-gray-600">
              <img src={trackImagePreviewUrl} alt="Album Art Preview" className="w-full h-full object-cover" />
            </div>
          )}
          {trackImageFile && (
            <span className="text-xs text-gray-400">
              Selected: {trackImageFile.name} ({Math.round(trackImageFile.size / 1024)} KB)
            </span>
          )}
          <span className="text-xs text-gray-500">This image will be used for this specific track.</span>
        </div>

        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">{uploadProgress}% uploaded</p>
          </div>
        )}
        {uploadMessage && (
          <div
            className={clsx(
              "mt-4 p-3 rounded-md text-sm text-center",
              isError ? "bg-red-700/30 text-red-300" : "bg-green-700/30 text-green-300"
            )}
          >
            {uploadMessage}
          </div>
        )}

        <Button type="submit" disabled={loading} className="mt-4">
          {loading ? <ClipLoader size={16} color="#fff" /> : "Upload Music"}
        </Button>
      </form>
    </div>
  );
};

export default PostixfyUpload;

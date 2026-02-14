import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ClipLoader } from "react-spinners";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { FileItem } from "../../../../store/useFilesystemStore";
import { API, readDirectory, readFile } from "../../../../utils";
import Button from "../../../utils/Button";
import PostixfyUpload from "./PostfixyUpload";
import RenderIfVisible from "../../../utils/RenderIfVisible";
import { formatTime, timeToSeconds } from "./utils";
import { useSystemStore } from "../../../../store/useSystemStore";

interface SongItem extends FileItem {
  metadata?: SongMetadata;
}

interface SongMetadata {
  author?: string;
  title?: string;
  duration?: string;
  imagePath?: string;
}

export default function Postixfy({ winId }: { winId: string }) {
  const POSTIXFY_ROOT = "/apps/postixfy/playlists";

  const setCustomWindow = useSystemStore((store) => store.setCustomWindow);

  const [playlists, setPlaylists] = useState<{ name: string; iconUrl: string | null; songs: SongItem[] }[]>([]);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState<number | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [songLoading, setSongLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [currentView, setCurrentView] = useState<"player" | "upload">("player");

  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeRef = useRef(1);
  const isSeeking = useRef(false);
  const isLoading = useRef(false);

  const currentPlaylist = selectedPlaylistIndex !== null ? playlists[selectedPlaylistIndex] : null;
  const currentSong = currentPlaylist && currentSongIndex !== null ? currentPlaylist.songs[currentSongIndex] : null;
  const currentSongUrl = currentSong
    ? `${API}/api/filesystem/file?path=${POSTIXFY_ROOT}/${currentPlaylist!.name}/${currentSong.name}`
    : null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  const filledColor = "#22c55e";
  const unfilledColor = "#4b5563";

  const progressBackground = `linear-gradient(to right, ${filledColor} ${progressPercentage}%, ${unfilledColor} ${progressPercentage}%)`;
  const volumeBackground = `linear-gradient(to right, ${filledColor} ${volumePercentage}%, ${unfilledColor} ${volumePercentage}%)`;

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postixfyDir = await readDirectory(POSTIXFY_ROOT);
      const playlistDirs = postixfyDir.contents.filter((item) => item.type === "folder" && item.name != "temp_uploads");

      const loadedPlaylists = await Promise.all(
        playlistDirs.map(async (playlistDir) => {
          const playlistPath = `${POSTIXFY_ROOT}/${playlistDir.name}`;
          const playlistContents = await readDirectory(playlistPath);

          const iconFile = playlistContents.contents.find((item) => item.name === "icon.png");
          const songFiles = playlistContents.contents.filter(
            (item) => item.type === "file" && !item.name.includes("icon.png") && !item.name.includes("metadata.json"),
          );
          const metadataFile = playlistContents.contents.find((item) => item.name === "metadata.json");

          let playlistMetadata: { [key: string]: SongMetadata } = {};
          if (metadataFile) {
            try {
              const metadataUrl = `${playlistPath}/metadata.json`;
              const response = await readFile(metadataUrl).catch(() => null);
              if (response) playlistMetadata = JSON.parse(new TextDecoder().decode(response));
            } catch (metaErr) {
              console.warn(`Error parsing metadata.json for ${playlistDir.name}:`, metaErr);
            }
          }

          const songs: SongItem[] = songFiles.map((songFile) => {
            const songNameWithoutExt = songFile.name.replace(/\.(mp3|wav|flac)$/, "");
            const metadata = playlistMetadata[songFile.name] || playlistMetadata[songNameWithoutExt];

            let albumArtFullUrl: string | undefined;
            if (metadata?.imagePath) {
              albumArtFullUrl = `${API}/api/filesystem/file?path=${playlistPath}/${metadata.imagePath}`;
            }

            return {
              ...songFile,
              metadata: {
                author: metadata?.author,
                title: metadata?.title || songNameWithoutExt,
                duration: metadata?.duration,
                imagePath: albumArtFullUrl,
              },
            };
          });

          return {
            name: playlistDir.name,
            iconUrl: iconFile ? `${API}/api/filesystem/file?path=${playlistPath}/icon.png` : null,
            songs: songs.sort((a, b) => a.name.localeCompare(b.name)),
          };
        }),
      );
      setPlaylists(loadedPlaylists);
    } catch (err: any) {
      console.error("Failed to load playlists:", err);
      setError(`Failed to load playlists: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
      if (currentSongUrl) {
        audioRef.current.src = currentSongUrl;
        audioRef.current.load();

        setCustomWindow({
          id: winId,
          name: "Postixfy - " + (currentSong?.metadata?.title || "Playing a song"),
        });
        // window.document.querySelector("#favicon").href = currentSong?.metadata?.imagePath;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong?.metadata?.title,
          artist: currentSong?.metadata?.author,
          artwork: currentSong?.metadata?.imagePath
            ? [
                { src: currentSong?.metadata?.imagePath, sizes: "96x96", type: "image/png" },
                { src: currentSong?.metadata?.imagePath, sizes: "128x128", type: "image/png" },
                { src: currentSong?.metadata?.imagePath, sizes: "192x192", type: "image/png" },
                { src: currentSong?.metadata?.imagePath, sizes: "256x256", type: "image/png" },
                { src: currentSong?.metadata?.imagePath, sizes: "384x384", type: "image/png" },
                { src: currentSong?.metadata?.imagePath, sizes: "512x512", type: "image/png" },
              ]
            : [],
        });

        if (isPlaying) {
          audioRef.current.play().catch((e) => console.error("Error playing audio:", e));
        } else {
          audioRef.current.pause();
        }
      } else {
        audioRef.current.src = "";
        setIsPlaying(false);
      }
    }
  }, [currentSongUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.error("Error playing audio:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    isLoading.current = songLoading;
  }, [songLoading]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadStart = () => setSongLoading(true);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => !audio.ended && setIsPlaying(false);
    const onDurationChange = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (!isSeeking.current) setCurrentTime(audio.currentTime);
      if (isLoading.current) setSongLoading(false);
    };
    const onEnded = () => {
      if (currentPlaylist && currentSongIndex !== null && currentSongIndex < currentPlaylist.songs.length - 1) {
        setCurrentSongIndex((prev) => (prev !== null ? prev + 1 : 0));
      } else {
        setIsPlaying(false);
        setCurrentSongIndex(null);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("loadstart", onLoadStart);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationChange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("loadstart", onLoadStart);
    };
  }, [currentPlaylist, currentSongIndex]);

  const togglePlayPause = useCallback(() => {
    if (currentSongUrl) {
      setIsPlaying((prev) => !prev);
    } else if (playlists.length > 0 && playlists[0].songs.length > 0) {
      setSelectedPlaylistIndex(0);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    }
  }, [currentSongUrl, playlists]);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  }, []);

  const handleSeekMouseDown = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeekMouseUp = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.currentTarget.value);
      isSeeking.current = false;
      if (!audioRef.current.paused && isPlaying) {
        audioRef.current.play().catch((e) => console.error("Error resuming playback:", e));
      }
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    volumeRef.current = newVolume;
    if (audioRef.current) audioRef.current.volume = newVolume;
  }, []);

  const playlistDuration = useMemo(
    () => currentPlaylist?.songs.reduce((acc, next) => acc + timeToSeconds(next.metadata?.duration ?? "0"), 0),
    [currentPlaylist],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#101010]/80">
        <ClipLoader color="#fff" />
        <span className="ml-2">Loading Postixfy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#101010]/80 text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full text-start font-code text-sm">
      <div className="flex flex-row h-full bg-[#1c1c1c]/90 text-white overflow-hidden w-full">
        <div
          className={clsx("p-1 top-2 right-2 md:hidden absolute bg-neutral-800 rounded-lg", {
            hidden: playlistsOpen,
          })}
          onPointerUp={() => setPlaylistsOpen(true)}
        >
          <Icon icon="material-symbols:menu-rounded" width="32" height="32" />
        </div>

        <div
          className={clsx("bg-[#0a0a0a]/60 border-r border-[#222] p-4 flex flex-col", {
            "w-1/4 min-w-64": window.innerWidth > 768,
            "w-full": window.innerWidth <= 768,
            hidden: !playlistsOpen && window.innerWidth < 768,
          })}
        >
          <div className="flex flex-row justify-between">
            <h2 className="md:text-xl text-lg font-bold mb-4 text-white">Playlists</h2>
            <div className="md:hidden cursor-pointer" onPointerUp={() => setPlaylistsOpen(false)}>
              <Icon icon="material-symbols:close-rounded" width="32" height="32" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollable">
            {playlists.length === 0 ? (
              <p className="text-gray-400 text-sm">No playlists found.</p>
            ) : (
              playlists.map((playlist, index) => (
                <div
                  key={playlist.name}
                  onClick={() => {
                    setSelectedPlaylistIndex(index);
                    setPlaylistsOpen(false);
                  }}
                  className={clsx(
                    "flex items-center p-2 rounded-md cursor-pointer transition-colors",
                    selectedPlaylistIndex === index ? "bg-[#282828]" : "hover:bg-[#1a1a1a]",
                  )}
                >
                  {playlist.iconUrl ? (
                    <img src={playlist.iconUrl} alt={playlist.name} className="w-8 h-8 rounded mr-3" />
                  ) : (
                    <Icon
                      icon="material-symbols:music-note-list"
                      width="32"
                      height="32"
                      className="mr-3 text-gray-400"
                    />
                  )}
                  <span className="font-medium text-white text-sm">{playlist.name}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-[#222]">
            <Button
              onClick={() => {
                setCurrentView(currentView == "upload" ? "player" : "upload");
                if (window.innerWidth < 768) setPlaylistsOpen(false);
              }}
              className={clsx(
                "w-full justify-center",
                currentView === "upload" ? "bg-green-600 hover:bg-green-700" : "bg-[#3a3a3a] hover:bg-[#4a4a4a]",
              )}
            >
              <Icon icon="material-symbols:cloud-upload" className="mr-2" /> Upload Music
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {currentView === "player" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2 w-full scrollable">
              {currentPlaylist ? (
                <>
                  <h2 className="md:text-2xl text-xl font-bold mb-4 flex items-center">
                    {currentPlaylist.iconUrl ? (
                      <img
                        src={currentPlaylist.iconUrl}
                        alt={currentPlaylist.name}
                        className="w-12 h-12 rounded mr-4 shadow-md"
                        fetchPriority="low"
                      />
                    ) : (
                      <Icon
                        icon="material-symbols:album-outline"
                        width="48"
                        height="48"
                        className="mr-4 text-gray-400"
                      />
                    )}
                    <div className="flex md:flex-row flex-col flex-wrap items-baseline md:gap-5 gap-1">
                      <span>{currentPlaylist.name}</span>
                      <span className="text-sm text-gray-600">
                        ({playlistDuration && formatTime(playlistDuration)})
                      </span>
                    </div>
                  </h2>
                  {currentPlaylist.songs.length === 0 ? (
                    <p className="text-gray-400 text-sm">No songs in this playlist.</p>
                  ) : (
                    currentPlaylist.songs.map((song, index) => (
                      <div
                        key={song.name}
                        onClick={() => {
                          setCurrentSongIndex(index);
                          setIsPlaying(true);
                        }}
                        className={clsx(
                          "flex flex-row justify-between items-center p-3 rounded-md cursor-pointer transition-colors w-full",
                          currentSongIndex === index ? "bg-[#333]/70 border border-green-800" : "md:hover:bg-[#1a1a1a]",
                        )}
                      >
                        <div className="flex flex-row gap-2 w-9/12">
                          {song.metadata?.imagePath ? (
                            <RenderIfVisible stayRendered rootElementClass="w-10 h-10 shrink-0">
                              <img
                                src={song.metadata.imagePath}
                                alt={song.metadata.title || song.name}
                                className="w-10 h-10 rounded mr-3"
                                fetchPriority="low"
                              />
                            </RenderIfVisible>
                          ) : (
                            <Icon
                              icon="material-symbols:music-note"
                              className={clsx(
                                "mr-3",
                                currentSongIndex === index && isPlaying ? "text-green-500" : "text-gray-400",
                              )}
                              width="24"
                              height="24"
                            />
                          )}
                          <span className="flex flex-col text-white truncate">
                            <span className="truncate md:text-sm text-xs">{song.metadata?.title || song.name}</span>
                            {song.metadata?.author && (
                              <span className="text-gray-400 text-xs">{song.metadata.author}</span>
                            )}
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs ml-2">{song.metadata?.duration ?? ""}</span>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div className="flex justify-center items-center h-full text-gray-400">
                  Select a playlist to start listening.
                </div>
              )}
            </div>
          ) : (
            <PostixfyUpload
              availablePlaylists={playlists.map((pl) => ({ name: pl.name, iconUrl: pl.iconUrl }))}
              onUploadSuccess={() => {
                loadPlaylists();
                setCurrentView("player");
              }}
            />
          )}
        </div>
      </div>

      <div className="flex-none bg-[#282828] px-4 py-2 flex flex-row justify-around items-center border-t border-[#333]">
        <audio ref={audioRef} />
        <div className="flex items-center flex-shrink-0 w-1/4">
          {currentSong?.metadata?.imagePath ? (
            <img
              src={currentSong.metadata.imagePath}
              alt={currentSong.metadata.title || currentSong.name}
              className="w-12 h-12 rounded-md mr-3"
            />
          ) : currentPlaylist?.iconUrl ? (
            <img src={currentPlaylist.iconUrl} alt={currentPlaylist.name} className="w-12 h-12 rounded-md mr-3" />
          ) : (
            <Icon icon="material-symbols:album-outline" width="48" height="48" className="mr-3 text-gray-600" />
          )}
          <div className="md:flex flex-col hidden">
            <div className="text-sm font-semibold truncate max-w-[120px]">
              {currentSong ? currentSong.metadata?.title || currentSong.name : "Not playing"}
            </div>
            <div className="text-xs text-gray-400 truncate max-w-[120px]">
              {currentSong?.metadata?.author || (currentPlaylist ? currentPlaylist.name : "Select a song")}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-center mb-1">
            <button
              onClick={() => {
                if (currentPlaylist && currentSongIndex !== null && currentSongIndex > 0) {
                  setCurrentSongIndex((prev) => (prev !== null ? prev - 1 : null));
                }
              }}
              disabled={!currentPlaylist || currentSongIndex === 0}
              className="p-1 rounded-full hover:bg-[#3e3e3e] text-gray-400 disabled:opacity-50"
            >
              <Icon icon="material-symbols:skip-previous" width="24" height="24" />
            </button>
            <button
              onClick={togglePlayPause}
              disabled={songLoading}
              className={clsx("p-2 rounded-full mx-2", {
                "hover:bg-[#3e3e3e]": !songLoading,
              })}
            >
              {songLoading ? (
                <ClipLoader color="#fff" />
              ) : (
                <Icon
                  icon={isPlaying ? "material-symbols:pause" : "material-symbols:play-arrow"}
                  width="32"
                  height="32"
                  className="text-green-500"
                />
              )}
            </button>
            <button
              onClick={() => {
                if (
                  currentPlaylist &&
                  currentSongIndex !== null &&
                  currentSongIndex < currentPlaylist.songs.length - 1
                ) {
                  setCurrentSongIndex((prev) => (prev !== null ? prev + 1 : 0));
                }
              }}
              disabled={
                !currentPlaylist || (currentSongIndex !== null && currentSongIndex === currentPlaylist.songs.length - 1)
              }
              className="p-1 rounded-full hover:bg-[#3e3e3e] text-gray-400 disabled:opacity-50"
            >
              <Icon icon="material-symbols:skip-next" width="24" height="24" />
            </button>
          </div>
          <div className="w-full flex items-center justify-center mb-2">
            <span className="text-xs text-gray-400 mr-2">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              disabled={!currentSongUrl}
              className={clsx("flex-1 h-1 rounded-lg appearance-none cursor-pointer", "bg-gray-600")}
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
                background: progressBackground,
                cursor: "pointer",
              }}
            />
            <span className="text-xs text-gray-400 ml-2">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="md:flex items-center flex-shrink-0 w-1/4 justify-end hidden">
          <Icon icon="material-symbols:volume-up" width="20" height="20" className="text-gray-400 mr-2" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              background: volumeBackground,
              cursor: "pointer",
              maxWidth: "100px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

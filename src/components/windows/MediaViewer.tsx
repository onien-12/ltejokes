import React, { useEffect, useState, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { readFile } from "../../utils";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface MediaViewerProps {
  path: string;
}

const isURL = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
};

const MediaViewer: React.FC<MediaViewerProps> = ({ path }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<
    "image" | "video" | "unsupported" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMediaUrl(null);
    setMediaType(null);

    const loadMedia = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      let mediaBlob: Blob | null = null;
      let finalMediaSource: string | null = null;
      let fileNameForDisplay = path.split("/").pop();

      try {
        if (isURL(path)) {
          const response = await fetch(path);
          if (!response.ok) {
            setError(`Error loading media from network: ${response.status}`);
          }
          mediaBlob = await response.blob();
          finalMediaSource = path;
          const urlParts = path.split("/");
          fileNameForDisplay = urlParts[urlParts.length - 1].split("?")[0];
        } else {
          const arrayBuffer = await readFile(path);
          mediaBlob = new Blob([arrayBuffer]);
          finalMediaSource = URL.createObjectURL(mediaBlob);
          objectUrlRef.current = finalMediaSource;
        }

        const mimeType = mediaBlob.type;
        const fileExtension = path.split(".").pop()?.toLowerCase();
        let type: "image" | "video" | "unsupported" = "unsupported";

        if (mimeType.startsWith("image/")) {
          type = "image";
        } else if (mimeType.startsWith("video/")) {
          type = "video";
        }

        if (type === "unsupported" && fileExtension) {
          if (
            ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(fileExtension)
          ) {
            type = "image";
          } else if (["mp4", "webm", "ogg"].includes(fileExtension)) {
            type = "video";
          }
        }

        if (type === "unsupported") {
          setError(`Unsupported media type: ${mimeType || "unknown"}`);
          setLoading(false);
          return;
        }

        setMediaUrl(finalMediaSource);
        setMediaType(type);
      } catch (err: any) {
        console.error("Failed to load media:", err);
        setError(`Failed to load media: ${err.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [path]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#101010]/80 p-4">
      {loading ? (
        <ClipLoader className="text-white" color="#fff" />
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : mediaUrl && mediaType ? (
        <div className="flex flex-col items-center justify-center w-full h-full relative">
          {mediaType === "image" ? (
            <TransformWrapper>
              <TransformComponent>
                <img
                  src={mediaUrl}
                  alt="Media Viewer Content"
                  className="max-w-full max-h-full object-contain"
                  onError={() => setError("Could not display image.")}
                />
              </TransformComponent>
            </TransformWrapper>
          ) : mediaType === "video" ? (
            <video
              src={mediaUrl}
              controls
              className="max-w-full max-h-full object-contain"
              onError={() => setError("Could not play video.")}
            >
              Your browser does not support the video tag.
            </video>
          ) : null}
          <div className="absolute bottom-2 left-2 text-white/70 text-xs truncate max-w-full px-1 py-0.5 bg-black/50 rounded-sm">
            {path.split("/").pop()}{" "}
          </div>
        </div>
      ) : (
        <div className="text-gray-400">No media loaded.</div>
      )}
    </div>
  );
};

export default MediaViewer;

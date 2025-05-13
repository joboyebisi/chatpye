"use client";

import { useState, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
  const [videoId, setVideoId] = useState("");

  useEffect(() => {
    try {
      const url = new URL(src);
      const id = url.searchParams.get("v");
      if (id) {
        setVideoId(id);
      }
    } catch (error) {
      console.error("Invalid URL");
    }
  }, [src]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative bg-black">
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Welcome to ChatPye</h2>
              <p className="text-gray-400">Enter a YouTube URL to start learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
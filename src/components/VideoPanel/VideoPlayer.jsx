import React, { useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { usePoseStore } from '../../store/usePoseStore';

export const VideoPlayer = () => {
  const videoRef = useRef(null);
  const reactPlayerRef = useRef(null);
  const {
    isCameraActive,
    videoUrl,
    isProcessing,
    setVideoElement,
  } = usePoseStore();

  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      setVideoElement(videoRef.current);
    } else if (!isCameraActive && videoUrl && reactPlayerRef.current) {
      setVideoElement(reactPlayerRef.current);
    }
    return () => {
      setVideoElement(null);
    };
  }, [isCameraActive, videoUrl]);

  return (
    <>
      {isCameraActive ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-element inverted"
        ></video>
      ) : videoUrl ? (
        <div className="video-wrapper">
          <ReactPlayer
            ref={reactPlayerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isProcessing}
            loop
            muted
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            config={{
              file: {
                attributes: {
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }
                }
              }
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50 text-white">
          <i className="fa fa-video-camera text-6xl mb-4 text-gray-300"></i>
          <p className="text-xl font-medium mb-2">No video selected</p>
          <p className="text-gray-300 text-sm">Upload a video or start camera to begin</p>
        </div>
      )}
    </>
  );
};

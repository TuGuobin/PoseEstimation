import React from 'react';
import { flushSync } from 'react-dom';
import { usePoseStore } from '../../store/usePoseStore';

export const ProcessControl = () => {
  const {
    isLoading,
    isProcessing,
    isCameraActive,
    videoUrl,
    setIsProcessing,
  } = usePoseStore();

  const startProcessingVideo = () => {
    const state = usePoseStore.getState();
    if (!state.holisticRef?.current || (!state.videoRef?.current && !videoUrl)) return;

    flushSync(() => setIsProcessing(true));
    
    const processVideoFrame = async () => {
      const currentState = usePoseStore.getState();
      if (!currentState.isProcessing || !currentState.videoRef?.current) {
        return;
      }
      const player = currentState.videoRef.current.getInternalPlayer?.();
      if (player && currentState.holisticRef?.current) {
        await currentState.holisticRef.current.send({ image: player });
      }
      requestAnimationFrame(processVideoFrame);
    };

    processVideoFrame();
  };

  const stopProcessingVideo = () => {
    setIsProcessing(false);
  };

  const isDisabled = isLoading || (!isCameraActive && !videoUrl);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fa fa-magic text-purple-600 text-lg"></i>
        </div>
        <h3 className="text-sm font-semibold">Processing</h3>
      </div>
      {!isProcessing ? (
        <button
          className="control-button control-button-primary w-full justify-center text-sm py-2"
          onClick={startProcessingVideo}
          disabled={isDisabled}
        >
          <i className="fa fa-play"></i>
          <span>Start</span>
        </button>
      ) : (
        <button
          className="control-button control-button-secondary w-full justify-center text-sm py-2"
          onClick={stopProcessingVideo}
        >
          <i className="fa fa-pause"></i>
          <span>Stop</span>
        </button>
      )}
    </div>
  );
};

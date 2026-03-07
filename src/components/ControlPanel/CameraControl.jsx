import React from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { usePoseStore } from '../../store/usePoseStore';

const mediapipeTool = {
  Camera: Camera || window.Camera,
};

export const CameraControl = () => {
  const {
    isLoading,
    isCameraActive,
    setIsCameraActive,
    setVideoUrl,
    setIsProcessing,
  } = usePoseStore();

  const startCamera = () => {
    const state = usePoseStore.getState();
    if (!state.holisticRef?.current) return;

    setIsCameraActive(true);
    setVideoUrl('');

    try {
      requestAnimationFrame(() => {
        const videoElement = state.videoRef?.current;
        if (!videoElement) return;

        const camera = new mediapipeTool.Camera(videoElement, {
          onFrame: async () => {
            const { isProcessing, holisticRef } = usePoseStore.getState();
            if (!isProcessing || !holisticRef?.current) return;
            
            // 检查视频元素是否有效
            if (!videoElement || 
                videoElement.videoWidth === 0 || 
                videoElement.videoHeight === 0 ||
                videoElement.readyState < 2) {
              return;
            }
            
            // 使用新的 detectForVideo 方法
            const { detectForVideo } = holisticRef.current;
            if (detectForVideo) {
              const timestamp = performance.now();
              await detectForVideo(videoElement, timestamp);
            }
          },
          width: 1280,
          height: 720
        });

        camera.start();
        
        // 直接更新 ref
        const { cameraRef } = usePoseStore.getState();
        if (cameraRef) {
          cameraRef.current = camera;
        }
        
        setIsProcessing(true);
      });
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Failed to access camera. Please ensure you have granted camera permissions and your camera is working.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    const state = usePoseStore.getState();
    if (state.cameraRef?.current) {
      state.cameraRef.current.stop();
      state.cameraRef.current = null;
    }
    setIsCameraActive(false);
    setIsProcessing(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fa fa-video-camera text-primary text-lg"></i>
        </div>
        <h3 className="text-sm font-semibold">Camera</h3>
      </div>
      {!isCameraActive ? (
        <button
          className="control-button control-button-primary w-full justify-center text-sm py-2"
          onClick={startCamera}
          disabled={isLoading}
        >
          <i className="fa fa-video-camera"></i>
          <span>Start</span>
        </button>
      ) : (
        <button
          className="control-button control-button-secondary w-full justify-center text-sm py-2"
          onClick={stopCamera}
        >
          <i className="fa fa-stop"></i>
          <span>Stop</span>
        </button>
      )}
    </div>
  );
};

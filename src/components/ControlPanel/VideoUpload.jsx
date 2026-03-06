import React from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const VideoUpload = () => {
  const { setVideoUrl, setIsCameraActive } = usePoseStore();

  const handleVideoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const videoUrl = URL.createObjectURL(file);

      setVideoUrl(videoUrl);
      setIsCameraActive(false);

      // 停止摄像头
      const state = usePoseStore.getState();
      if (state.cameraRef?.current) {
        state.cameraRef.current.stop();
        state.cameraRef.current = null;
      }

      // 清除 canvas 上的骨骼信息
      if (state.canvasRef?.current) {
        const canvas = state.canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // 清除 lastResultsRef
      if (state.lastResultsRef) {
        state.lastResultsRef.current = null;
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fa fa-film text-secondary text-lg"></i>
        </div>
        <h3 className="text-sm font-semibold">Upload Video</h3>
      </div>
      <label htmlFor="videoUpload" className="control-button control-button-primary w-full justify-center cursor-pointer text-sm py-2">
        <i className="fa fa-upload"></i>
        <span>Select File</span>
      </label>
      <input
        type="file"
        id="videoUpload"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
    </div>
  );
};

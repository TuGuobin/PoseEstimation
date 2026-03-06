import React from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const ConfidenceSettings = () => {
  const {
    detectionConfidence,
    trackingConfidence,
    setDetectionConfidence,
    setTrackingConfidence,
    isProcessing,
  } = usePoseStore();

  const handleDetectionConfidenceChange = (e) => {
    setDetectionConfidence(Number(e.target.value));
  };

  const handleTrackingConfidenceChange = (e) => {
    setTrackingConfidence(Number(e.target.value));
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fa fa-sliders text-yellow-600 text-lg"></i>
        </div>
        <h3 className="text-sm font-semibold">Confidence Settings</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600">Detection</label>
          <span className="text-xs text-gray-500 font-medium">{detectionConfidence.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={detectionConfidence}
          onChange={handleDetectionConfidenceChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600">Tracking</label>
          <span className="text-xs text-gray-500 font-medium">{trackingConfidence.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={trackingConfidence}
          onChange={handleTrackingConfidenceChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    </div>
  );
};

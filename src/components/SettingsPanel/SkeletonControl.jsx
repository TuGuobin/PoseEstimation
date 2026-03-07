import React from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const SkeletonControl = () => {
  const {
    showSkeleton,
    setShowSkeleton,
    skeletonLineWidth,
    setSkeletonLineWidth,
    skeletonPointRadius,
    setSkeletonPointRadius,
  } = usePoseStore();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fa fa-user text-orange-600 text-lg"></i>
        </div>
        <h3 className="text-sm font-semibold">Skeleton</h3>
      </div>

      <button
        onClick={() => setShowSkeleton(!showSkeleton)}
        className={`control-button w-full justify-center text-sm py-2 ${showSkeleton ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
      >
        <i className={`fa ${showSkeleton ? 'fa-user' : 'fa-user-slash'}`}></i>
        <span>{showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}</span>
      </button>

      {showSkeleton && (
        <div className="space-y-4 pt-4">
          {/* 线条粗细调整 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-600 font-medium">Line Width</label>
              <span className="text-xs text-gray-500">{skeletonLineWidth}px</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={skeletonLineWidth}
              onChange={(e) => setSkeletonLineWidth(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* 点大小调整 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-600 font-medium">Point Size</label>
              <span className="text-xs text-gray-500">{skeletonPointRadius}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={skeletonPointRadius}
              onChange={(e) => setSkeletonPointRadius(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

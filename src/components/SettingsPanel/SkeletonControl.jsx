import React from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const SkeletonControl = () => {
  const { showSkeleton, setShowSkeleton } = usePoseStore();

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
    </div>
  );
};

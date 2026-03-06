import React from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const AvatarControl = () => {
  const {
    showVRM,
    avatarMode,
    selectedModel,
    availableModels,
    setShowVRM,
    setAvatarMode,
    setSelectedModel,
  } = usePoseStore();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <i className={`fa ${avatarMode === 'vrm' ? 'fa-cube' : 'fa-user-circle'} text-indigo-600 text-lg`}></i>
        </div>
        <h3 className="text-sm font-semibold">Avatar</h3>
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-600 block mb-2">Avatar Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => setAvatarMode('vrm')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              avatarMode === 'vrm'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fa fa-cube"></i>
            <span>3D</span>
          </button>
          <button
            onClick={() => setAvatarMode('live2d')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              avatarMode === 'live2d'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fa fa-user-circle"></i>
            <span>2D</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setShowVRM(!showVRM)}
          className={`control-button w-full justify-center text-sm py-2 ${showVRM ? 'control-button-secondary' : 'control-button-primary'}`}
        >
          <i className={`fa ${showVRM ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          <span>{showVRM ? 'Hide Avatar' : 'Show Avatar'}</span>
        </button>

        {showVRM && avatarMode === 'vrm' && (
          <div className="pt-4 border-t border-gray-200">
            <label className="text-xs text-gray-600 block mb-2">Select Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableModels.map((model, index) => (
                <option key={index} value={index}>{model.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

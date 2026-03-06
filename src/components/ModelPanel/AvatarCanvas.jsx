import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { VRMViewer } from './VRMViewer';
import { Live2DViewer } from './Live2DViewer';
import { usePoseStore } from '../../store/usePoseStore';

export const AvatarCanvas = () => {
  const {
    poseData,
    selectedModel,
    showVRM,
    avatarMode,
    availableModels,
    getVideoElement,
  } = usePoseStore();

  const videoElement = getVideoElement();

  return (
    <div className="mt-6 w-full aspect-video bg-gray-800 rounded-lg shadow-xl overflow-hidden transition-all duration-300">
      {showVRM ? (
        avatarMode === 'vrm' ? (
          <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <VRMViewer
              avatarUrl={`/vrm/${availableModels[selectedModel].file}`}
              poseData={poseData}
              videoElement={videoElement}
            />
            <OrbitControls
              target={[0, 1, 0]}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={10}
            />
          </Canvas>
        ) : (
          <Live2DViewer
            poseData={poseData}
            videoElement={videoElement}
          />
        )
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
          <i className={`fa ${avatarMode === 'vrm' ? 'fa-cube' : 'fa-user-circle'} text-4xl mb-2 opacity-50`}></i>
          <p className="text-sm">{avatarMode === 'vrm' ? '3D Avatar Hidden' : 'Live2D Avatar Hidden'}</p>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { VideoUpload } from './VideoUpload';
import { CameraControl } from './CameraControl';
import { ProcessControl } from './ProcessControl';

export const ControlPanel = () => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <VideoUpload />
      <CameraControl />
      <ProcessControl />
    </div>
  );
};

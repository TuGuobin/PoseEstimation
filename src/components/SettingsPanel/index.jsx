import React from 'react';
import { ConfidenceSettings } from './ConfidenceSettings';
import { SkeletonControl } from './SkeletonControl';
import { AvatarControl } from './AvatarControl';

export const SettingsPanel = () => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <ConfidenceSettings />
      <SkeletonControl />
      <AvatarControl />
    </div>
  );
};

import { useHolistic } from '../hooks/useHolistic';
import { usePoseStore } from '../store/usePoseStore';
import { ControlPanel } from './ControlPanel';
import { SettingsPanel } from './SettingsPanel';
import { ModelPanel } from './ModelPanel';
import { VideoPanel } from './VideoPanel';

export function Main() {
  const { isLoading, isProcessing } = usePoseStore();

  useHolistic();

  return (
    <main className="flex-grow container mx-auto px-4 py-8 mb-8">
      <section className="mb-8 text-center">
        <h2 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-gray-800 mb-4">Human Pose Detection & 3D Avatar</h2>
        <p className="text-gray-600 max-w-3xl mx-auto">Capture human movements and see them mirrored in real-time 3D VRM avatars using MediaPipe and Three.js.</p>
      </section>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-gray-600">Loading pose estimation model...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧 - 控制面板 */}
          <ControlPanel />

          {/* 中间 - 视频显示区域 */}
          <div className="lg:col-span-8">
            <div className="video-container group">
              <VideoPanel />

              {isProcessing && (
                <div className="status-indicator">
                  <span className="w-2 h-2 bg-white rounded-full pulse-animation"></span>
                  <span>Processing</span>
                </div>
              )}
            </div>

            {/* Avatar Section */}
            <ModelPanel />
          </div>

          {/* 右侧 - 设置面板 */}
          <SettingsPanel />
        </div>
      )}
    </main>
  );
}
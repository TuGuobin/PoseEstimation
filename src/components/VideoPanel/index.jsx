import { SkeletonCanvas } from "./SkeletonCanvas"
import { VideoPlayer } from "./VideoPlayer"

export function VideoPanel() {
  return (
    <div className="video-panel w-full h-full">
      <VideoPlayer />
      <SkeletonCanvas />
    </div>
  )
}

import React, { useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { VRMViewer } from "./VRMViewer"
import { Live2DViewer } from "./Live2DViewer"
import { usePoseStore } from "../../store/usePoseStore"

export const AvatarCanvas = () => {
  const { poseData, selectedModel, showVRM, avatarMode, availableModels, getVideoElement } = usePoseStore()

  const orbitControlsRef = useRef()
  const videoElement = getVideoElement()

  const handleResetView = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.set(0, 1, -3)
      orbitControlsRef.current.target.set(0, 1, 0)
      orbitControlsRef.current.update()
    }
  }

  const handleFaceCloseUp = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.set(0, 1.7, -1)
      orbitControlsRef.current.target.set(0, 1.7, 0)
      orbitControlsRef.current.update()
    }
  }

  const handleUpperBody = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.set(0, 1.2, -2.2)
      orbitControlsRef.current.target.set(0, 1.2, 0)
      orbitControlsRef.current.update()
    }
  }

  const handleFullBody = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.set(0, 0.2, -4.2)
      orbitControlsRef.current.target.set(0, 0.2, 0)
      orbitControlsRef.current.update()
    }
  }

  return (
    <div className="mt-6 w-full aspect-video bg-gray-800 rounded-lg shadow-xl overflow-hidden transition-all duration-300 relative">
      {/* VRM 3D Avatar - 使用 visibility 控制显示/隐藏，避免卸载 Canvas 导致 WebGL 上下文丢失 */}
      <div className={`absolute inset-0 ${showVRM && avatarMode === "vrm" ? 'visible' : 'invisible'}`}>
        <div className={`absolute top-3 right-3 z-10 flex flex-col gap-2 transition-opacity duration-300 ${showVRM && avatarMode === "vrm" ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={handleResetView} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-colors duration-200 flex items-center gap-1.5 shadow-lg" title="Reset to Front View">
            <i className="fa fa-video-camera"></i>
            正视角
          </button>
          <button onClick={handleFaceCloseUp} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-colors duration-200 flex items-center gap-1.5 shadow-lg" title="Face Close-up">
            <i className="fa fa-user"></i>
            面部特写
          </button>
          <button onClick={handleUpperBody} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-colors duration-200 flex items-center gap-1.5 shadow-lg" title="Upper Body">
            <i className="fa fa-user-circle"></i>
            上半身
          </button>
          <button onClick={handleFullBody} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-colors duration-200 flex items-center gap-1.5 shadow-lg" title="Full Body">
            <i className="fa fa-arrows-alt-v"></i>
            全身
          </button>
        </div>
        <div className={`w-full h-full transition-opacity duration-300 ${showVRM && avatarMode === "vrm" ? 'opacity-100' : 'opacity-0'}`}>
          <Canvas camera={{ position: [0, 1, -3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <VRMViewer avatarUrl={`/vrm/${availableModels[selectedModel].file}`} poseData={poseData} videoElement={videoElement} />
            <OrbitControls ref={orbitControlsRef} target={[0, 1, 0]} enablePan={true} enableZoom={true} enableRotate={true} minDistance={1} maxDistance={10} />
          </Canvas>
        </div>
      </div>

      {/* Live2D Avatar */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showVRM && avatarMode === "live2d" ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <Live2DViewer poseData={poseData} videoElement={videoElement} />
      </div>

      {/* Hidden State */}
      {!showVRM && (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
          <i className={`fa ${avatarMode === "vrm" ? "fa-cube" : "fa-user-circle"} text-4xl mb-2 opacity-50`}></i>
          <p className="text-sm">{avatarMode === "vrm" ? "3D Avatar Hidden" : "Live2D Avatar Hidden"}</p>
        </div>
      )}
    </div>
  )
}

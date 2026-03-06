import { create } from 'zustand';

const availableModels = [
  { name: 'Model 1', file: '262410318834873893.vrm' },
  { name: 'Model 2', file: '3636451243928341470.vrm' },
  { name: 'Model 3', file: '3859814441197244330.vrm' },
  { name: 'Model 4', file: '4903904892802642869.vrm' },
  { name: 'Model 5', file: '8087383217573817818.vrm' },
];

export const usePoseStore = create((set, get) => ({
  // 加载状态
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 处理状态
  isProcessing: false,
  setIsProcessing: (processing) => set({ isProcessing: processing }),

  // 摄像头状态
  isCameraActive: false,
  setIsCameraActive: (active) => set({ isCameraActive: active }),

  // 视频URL
  videoUrl: '',
  setVideoUrl: (url) => set({ videoUrl: url }),

  // 置信度设置
  detectionConfidence: 0.5,
  setDetectionConfidence: (confidence) => {
    set({ detectionConfidence: confidence });
    const { holisticRef } = get();
    if (holisticRef?.current) {
      holisticRef.current.setOptions({ detectionConfidence: confidence });
    }
  },

  trackingConfidence: 0.5,
  setTrackingConfidence: (confidence) => {
    set({ trackingConfidence: confidence });
    const { holisticRef } = get();
    if (holisticRef?.current) {
      holisticRef.current.setOptions({ trackingConfidence: confidence });
    }
  },

  // 显示设置
  showVRM: true,
  setShowVRM: (show) => set({ showVRM: show }),

  showSkeleton: true,
  setShowSkeleton: (show) => set({ showSkeleton: show }),

  // 模型选择
  selectedModel: 0,
  setSelectedModel: (index) => set({ selectedModel: index }),
  availableModels,

  // 头像模式
  avatarMode: 'vrm',
  setAvatarMode: (mode) => set({ avatarMode: mode }),

  // 姿态数据
  poseData: null,
  setPoseData: (data) => set({ poseData: data }),

  // Refs - 使用稳定的引用对象
  videoRef: { current: null },
  canvasRef: { current: null },
  holisticRef: { current: null },
  cameraRef: { current: null },
  lastResultsRef: { current: null },

  // 设置refs - 直接修改current属性而不是替换整个对象
  setVideoElement: (el) => {
    const { videoRef } = get();
    if (videoRef.current !== el) {
      videoRef.current = el;
    }
  },
  setCanvasElement: (el) => {
    const { canvasRef } = get();
    if (canvasRef.current !== el) {
      canvasRef.current = el;
    }
  },
  setHolisticRef: (ref) => {
    const { holisticRef } = get();
    if (holisticRef.current !== ref.current) {
      holisticRef.current = ref.current;
    }
  },
  setCameraRef: (ref) => {
    const { cameraRef } = get();
    if (cameraRef.current !== ref.current) {
      cameraRef.current = ref.current;
    }
  },
  setLastResultsRef: (ref) => {
    const { lastResultsRef } = get();
    if (lastResultsRef.current !== ref.current) {
      lastResultsRef.current = ref.current;
    }
  },

  // 获取视频元素
  getVideoElement: () => {
    const state = get();
    if (state.isCameraActive) {
      return state.videoRef?.current;
    } else if (state.videoUrl && state.videoRef?.current) {
      return state.videoRef.current.getInternalPlayer?.() || state.videoRef.current;
    }
    return null;
  },

  // 重置状态
  resetState: () => set({
    isProcessing: false,
    isCameraActive: false,
    videoUrl: '',
    poseData: null,
  }),
}));

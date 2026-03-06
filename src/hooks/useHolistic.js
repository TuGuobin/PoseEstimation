import { useEffect, useCallback, useRef } from 'react';
import {
  Holistic,
  HAND_CONNECTIONS,
  FACEMESH_TESSELATION,
  FACEMESH_CONTOURS,
  POSE_CONNECTIONS
} from '@mediapipe/holistic';
import {
  drawConnectors,
  drawLandmarks
} from '@mediapipe/drawing_utils';
import { usePoseStore } from '../store/usePoseStore';

const mediapipeTool = {
  Holistic: Holistic || window.Holistic,
  HAND_CONNECTIONS: HAND_CONNECTIONS || window.HAND_CONNECTIONS,
  FACEMESH_TESSELATION: FACEMESH_TESSELATION || window.FACEMESH_TESSELATION,
  FACEMESH_CONTOURS: FACEMESH_CONTOURS || window.FACEMESH_CONTOURS,
  POSE_CONNECTIONS: POSE_CONNECTIONS || window.POSE_CONNECTIONS,
  drawConnectors: drawConnectors || window.drawConnectors,
  drawLandmarks: drawLandmarks || window.drawLandmarks,
};

export const useHolistic = () => {
  const {
    detectionConfidence,
    trackingConfidence,
    showVRM,
    setPoseData,
    setIsLoading,
    canvasRef,
    lastResultsRef,
  } = usePoseStore();

  // 使用本地 ref 来存储 holistic 实例
  const holisticInstanceRef = useRef(null);

  // 绘制函数 - 不依赖 showSkeleton，直接从 store 读取
  const drawCanvas = useCallback(() => {
    const canvasElement = canvasRef?.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');
    const results = lastResultsRef?.current;

    if (!results) return;

    const imageWidth = results.image?.width || 640;
    const imageHeight = results.image?.height || 480;

    canvasElement.width = imageWidth;
    canvasElement.height = imageHeight;

    const containerWidth = canvasElement.parentElement?.clientWidth || imageWidth;
    const containerHeight = canvasElement.parentElement?.clientHeight || imageHeight;
    const imageAspect = imageWidth / imageHeight;
    const containerAspect = containerWidth / containerHeight;

    if (imageAspect > containerAspect) {
      canvasElement.style.width = '100%';
      canvasElement.style.height = 'auto';
    } else {
      canvasElement.style.width = 'auto';
      canvasElement.style.height = '100%';
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    // 直接从 store 读取 showSkeleton，不依赖它
    const { showSkeleton } = usePoseStore.getState();
    if (showSkeleton) {
      if (results.poseLandmarks) {
        mediapipeTool.drawConnectors(canvasCtx, results.poseLandmarks, mediapipeTool.POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 3
        });
        mediapipeTool.drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 4
        });
      }

      if (results.faceLandmarks) {
        mediapipeTool.drawConnectors(canvasCtx, results.faceLandmarks, mediapipeTool.FACEMESH_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: 0.5
        });
        mediapipeTool.drawConnectors(canvasCtx, results.faceLandmarks, mediapipeTool.FACEMESH_CONTOURS, {
          color: '#00FFFF',
          lineWidth: 1.5
        });
        mediapipeTool.drawLandmarks(canvasCtx, results.faceLandmarks, {
          color: '#FFFF00',
          lineWidth: 0.5,
          radius: 1.5
        });
      }

      if (results.leftHandLandmarks) {
        mediapipeTool.drawConnectors(canvasCtx, results.leftHandLandmarks, mediapipeTool.HAND_CONNECTIONS, {
          color: '#0000FF',
          lineWidth: 2
        });
        mediapipeTool.drawLandmarks(canvasCtx, results.leftHandLandmarks, {
          color: '#FF00FF',
          lineWidth: 0.8,
          radius: 2.5
        });
      }

      if (results.rightHandLandmarks) {
        mediapipeTool.drawConnectors(canvasCtx, results.rightHandLandmarks, mediapipeTool.HAND_CONNECTIONS, {
          color: '#FF0000',
          lineWidth: 2
        });
        mediapipeTool.drawLandmarks(canvasCtx, results.rightHandLandmarks, {
          color: '#00FFFF',
          lineWidth: 0.8,
          radius: 2.5
        });
      }
    }

    canvasCtx.restore();
  }, [canvasRef, lastResultsRef]);

  // 结果处理回调
  const onResults = useCallback((results) => {
    // 直接修改 ref，不触发状态更新
    if (lastResultsRef) {
      lastResultsRef.current = results;
    }

    drawCanvas();

    if (showVRM && (results.poseLandmarks || results.faceLandmarks)) {
      setPoseData(results);
    }
  }, [showVRM, drawCanvas, setPoseData, lastResultsRef]);

  // 初始化 Holistic
  useEffect(() => {
    const initializeHolistic = async () => {
      try {
        const holistic = new mediapipeTool.Holistic({
          locateFile: (file) => {
            return `/holistic/${file}`;
          }
        });

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: true,
          detectionConfidence: detectionConfidence,
          trackingConfidence: trackingConfidence
        });

        holistic.onResults(onResults);

        holisticInstanceRef.current = holistic;
        
        // 更新 store 中的 ref
        const { holisticRef } = usePoseStore.getState();
        if (holisticRef) {
          holisticRef.current = holistic;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Holistic:', error);
        alert('Failed to initialize pose estimation model. Please refresh the page.');
      }
    };

    initializeHolistic();

    return () => {
      if (holisticInstanceRef.current) {
        holisticInstanceRef.current.close();
      }
    };
  }, [detectionConfidence, trackingConfidence, onResults, setIsLoading]);

  return {
    drawCanvas,
    onResults,
    mediapipeTool,
    holisticInstanceRef,
  };
};

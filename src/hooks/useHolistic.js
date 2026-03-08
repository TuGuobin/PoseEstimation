import { useEffect, useCallback, useRef } from 'react';
import {
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';
import { usePoseStore } from '../store/usePoseStore';

const MODEL_PATH_POSE = '/model/pose_landmarker_heavy.task';
const MODEL_PATH_HAND = '/model/hand_landmarker.task';
const MODEL_PATH_FACE = '/model/face_landmarker.task';

export const useHolistic = () => {
  const {
    isProcessing,
    canvasRef,
    lastResultsRef,
    setPoseData,
  } = usePoseStore();

  const poseLandmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const drawingUtilsRef = useRef(null);
  const isInitializedRef = useRef(false);

  const extractPoseLandmarks = useCallback((result) => {
    const landmarks = result.landmarks?.[0] || null;
    const worldLandmarks = result.worldLandmarks?.[0] || null;

    const poseVisibility = new Float32Array(33);
    if (landmarks) {
      for (let i = 0; i < 33 && i < landmarks.length; i++) {
        poseVisibility[i] = landmarks[i].visibility || 1.0;
      }
    }

    return { landmarks, worldLandmarks, poseVisibility };
  }, []);

  const extractHandData = useCallback((result) => {
    const hands = {
      left: { landmarks: null, worldLandmarks: null },
      right: { landmarks: null, worldLandmarks: null }
    };

    if (result.landmarks && result.landmarks.length > 0) {
      for (let idx = 0; idx < result.landmarks.length; idx++) {
        const landmarks = result.landmarks[idx];
        const handedness = result.handednesses?.[idx]?.[0]?.categoryName;
        const worldLandmarks = result.worldLandmarks?.[idx] || null;

        if (handedness === 'Left') {
          hands.left.landmarks = landmarks;
          hands.left.worldLandmarks = worldLandmarks;
        } else if (handedness === 'Right') {
          hands.right.landmarks = landmarks;
          hands.right.worldLandmarks = worldLandmarks;
        }
      }
    }

    return hands;
  }, []);

  const extractFaceData = useCallback((result) => {
    const faceLandmarks = result.faceLandmarks?.[0] || null;
    const faceBlendshapes = result.faceBlendshapes?.[0] || null;
    const faceTransformationMatrix = result.facialTransformationMatrixes?.[0] || null;

    return { faceLandmarks, faceBlendshapes, faceTransformationMatrix };
  }, []);

  const drawCanvas = useCallback((results) => {
    const canvasElement = canvasRef?.current;
    if (!canvasElement || !drawingUtilsRef.current) return;

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    const imageWidth = results.imageWidth || 640;
    const imageHeight = results.imageHeight || 480;

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

    const { showSkeleton, skeletonLineWidth, skeletonPointRadius } = usePoseStore.getState();
    if (showSkeleton) {
      const drawingUtils = drawingUtilsRef.current;

      const lineWidth = skeletonLineWidth;
      const pointRadius = skeletonPointRadius;

      if (results.poseLandmarks) {
        drawingUtils.drawLandmarks(results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: lineWidth * 0.5,
          radius: pointRadius
        });
        drawingUtils.drawConnectors(results.poseLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: lineWidth
        });
      }

      if (results.faceLandmarks) {
        drawingUtils.drawLandmarks(results.faceLandmarks, {
          color: '#FFFF00',
          lineWidth: lineWidth * 0.3,
          radius: pointRadius * 0.5
        });
        drawingUtils.drawConnectors(results.faceLandmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: lineWidth * 0.3
        });
        drawingUtils.drawConnectors(results.faceLandmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
          color: '#00FFFF',
          lineWidth: lineWidth * 0.7
        });
      }

      if (results.leftHandLandmarks) {
        drawingUtils.drawLandmarks(results.leftHandLandmarks, {
          color: '#FF00FF',
          lineWidth: lineWidth * 0.4,
          radius: pointRadius * 0.8
        });
        drawingUtils.drawConnectors(results.leftHandLandmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: '#0000FF',
          lineWidth: lineWidth * 0.8
        });
      }

      if (results.rightHandLandmarks) {
        drawingUtils.drawLandmarks(results.rightHandLandmarks, {
          color: '#00FFFF',
          lineWidth: lineWidth * 0.4,
          radius: pointRadius * 0.8
        });
        drawingUtils.drawConnectors(results.rightHandLandmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: '#FF0000',
          lineWidth: lineWidth * 0.8
        });
      }
    }

    canvasCtx.restore();
  }, [canvasRef]);

  const processResults = useCallback((poseResult, handResult, faceResult, image, imageWidth, imageHeight) => {
    const results = {
      image,
      imageWidth,
      imageHeight,
      poseLandmarks: null,
      poseWorldLandmarks: null,
      faceLandmarks: null,
      leftHandLandmarks: null,
      leftHandWorldLandmarks: null,
      rightHandLandmarks: null,
      rightHandWorldLandmarks: null,
    };

    if (poseResult) {
      const { landmarks, worldLandmarks, poseVisibility } = extractPoseLandmarks(poseResult);
      results.poseLandmarks = landmarks;
      results.poseWorldLandmarks = worldLandmarks;
      results.poseVisibility = poseVisibility;
    }

    if (handResult) {
      const hands = extractHandData(handResult);
      results.leftHandLandmarks = hands.left.landmarks;
      results.leftHandWorldLandmarks = hands.left.worldLandmarks;
      results.rightHandLandmarks = hands.right.landmarks;
      results.rightHandWorldLandmarks = hands.right.worldLandmarks;
    }

    if (faceResult) {
      const { faceLandmarks, faceBlendshapes, faceTransformationMatrix } = extractFaceData(faceResult);
      results.faceLandmarks = faceLandmarks;
      results.faceBlendshapes = faceBlendshapes;
      results.faceTransformationMatrix = faceTransformationMatrix;
    }

    if (lastResultsRef) {
      lastResultsRef.current = results;
    }

    drawCanvas(results);

    // 在内部获取状态，避免依赖变化导致重新初始化
    const { showVRM, setPoseData: setPoseDataFromStore } = usePoseStore.getState();
    if (showVRM && (results.poseLandmarks || results.faceLandmarks)) {
      setPoseDataFromStore(results);
    }
  }, [extractPoseLandmarks, extractHandData, extractFaceData, drawCanvas, lastResultsRef]);

  const detectForVideo = useCallback(async (imageSource) => {
    if (!poseLandmarkerRef.current || !handLandmarkerRef.current || !faceLandmarkerRef.current) {
      return;
    }

    if (!imageSource || 
        (imageSource.videoWidth === 0 && imageSource.width === 0) ||
        (imageSource.videoHeight === 0 && imageSource.height === 0) ||
        (imageSource.readyState !== undefined && imageSource.readyState < 2)) {
      return;
    }

    try {
      const timestamp = performance.now();
      const poseResult = poseLandmarkerRef.current.detectForVideo(imageSource, timestamp);
      const handResult = handLandmarkerRef.current.detectForVideo(imageSource, timestamp);
      const faceResult = faceLandmarkerRef.current.detectForVideo(imageSource, timestamp);

      processResults(
        poseResult,
        handResult,
        faceResult,
        imageSource,
        imageSource.videoWidth || imageSource.width || 640,
        imageSource.videoHeight || imageSource.height || 480
      );
    } catch (error) {
      if (error.message && error.message.includes('Aborted')) {
        console.warn('MediaPipe WASM aborted, possibly due to GPU context loss. Stopping detection.');
        const { setIsProcessing } = usePoseStore.getState();
        setIsProcessing(false);
      } else {
        console.error('Error during detection:', error);
      }
    }
  }, [processResults]);

  useEffect(() => {
    if (!isProcessing) {
      setPoseData(null);

      if (lastResultsRef?.current) {
        lastResultsRef.current = null;
      }

      const canvasElement = canvasRef?.current;
      if (canvasElement) {
        const canvasCtx = canvasElement.getContext('2d');
        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        }
      }
    }
  }, [isProcessing, canvasRef, lastResultsRef, setPoseData]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeLandmarkers = async () => {
      try {
        const { detectionConfidence, trackingConfidence } = usePoseStore.getState();

        const filesetResolver = await FilesetResolver.forVisionTasks(
          '/@mediapipe/tasks-vision@0.10.32/wasm'
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_PATH_POSE,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: detectionConfidence,
          minPosePresenceConfidence: detectionConfidence,
          minTrackingConfidence: trackingConfidence,
          outputSegmentationMasks: true
        });

        const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_PATH_HAND,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: detectionConfidence,
          minHandPresenceConfidence: detectionConfidence,
          minTrackingConfidence: trackingConfidence
        });

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_PATH_FACE,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: detectionConfidence,
          minFacePresenceConfidence: detectionConfidence,
          minTrackingConfidence: trackingConfidence,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true
        });

        poseLandmarkerRef.current = poseLandmarker;
        handLandmarkerRef.current = handLandmarker;
        faceLandmarkerRef.current = faceLandmarker;

        const canvasElement = canvasRef?.current;
        if (canvasElement) {
          const canvasCtx = canvasElement.getContext('2d');
          drawingUtilsRef.current = new DrawingUtils(canvasCtx);
        }

        const { holisticRef, setIsLoading: setIsLoadingFromStore } = usePoseStore.getState();
        if (holisticRef) {
          holisticRef.current = {
            poseLandmarker,
            handLandmarker,
            faceLandmarker,
            detectForVideo
          };
        }

        setIsLoadingFromStore(false);
        console.log('Landmarkers initialized successfully');
      } catch (error) {
        console.error('Error initializing Landmarkers:', error);
        alert('Failed to initialize pose estimation model. Please refresh the page.');
      }
    };

    initializeLandmarkers();

    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  return {
    detectForVideo,
    poseLandmarkerRef,
    handLandmarkerRef,
    faceLandmarkerRef,
    drawingUtilsRef,
  };
};

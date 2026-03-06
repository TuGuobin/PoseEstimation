import React, { useRef, useEffect } from 'react';
import { usePoseStore } from '../../store/usePoseStore';

export const SkeletonCanvas = () => {
  const canvasRef = useRef(null);
  const {
    isCameraActive,
    showSkeleton,
    setCanvasElement,
  } = usePoseStore();

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasElement(canvasRef.current);
    }
    return () => {
      setCanvasElement(null);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-overlay ${isCameraActive ? 'inverted' : ''} ${showSkeleton ? '' : 'hidden'}`}
    ></canvas>
  );
};

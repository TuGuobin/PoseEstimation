import { useState, useEffect, useRef } from 'react';
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
import { Camera } from '@mediapipe/camera_utils';
import ReactPlayer from 'react-player';

export default function Main() {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [detectionConfidence, setDetectionConfidence] = useState(0.5);
  const [trackingConfidence, setTrackingConfidence] = useState(0.5);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const holisticRef = useRef(null);
  const cameraRef = useRef(null);

  const isProcessingRef = useRef(isProcessing);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing && canvasRef.current) {
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext('2d');
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  }, [isProcessing]);

  useEffect(() => {
    const initializeHolistic = async () => {
      try {
        holisticRef.current = new Holistic({
          locateFile: (file) => {
            return `/holistic/${file}`;
          }
        });

        holisticRef.current.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: true,
          detectionConfidence: detectionConfidence,
          trackingConfidence: trackingConfidence
        });

        holisticRef.current.onResults(onResults);

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Holistic:', error);
        alert('Failed to initialize pose estimation model. Please refresh the page.');
      }
    };

    initializeHolistic();

    return () => {
      if (holisticRef.current) {
        holisticRef.current.close();
      }
    };
  }, [detectionConfidence, trackingConfidence]);

  const onResults = (results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    canvasElement.width = videoRef.current.videoWidth || canvasElement.clientWidth;
    canvasElement.height = videoRef.current.videoHeight || canvasElement.clientHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.image) {
      canvasCtx.drawImage(
        results.image,
        0, 0,
        canvasElement.width, canvasElement.height
      );
    }

    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 3
      });

      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 4
      });
    }

    if (results.faceLandmarks) {
      drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
        color: '#C0C0C070',
        lineWidth: 0.5
      });

      drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_CONTOURS, {
        color: '#00FFFF',
        lineWidth: 1.5
      });

      drawLandmarks(canvasCtx, results.faceLandmarks, {
        color: '#FFFF00',
        lineWidth: 0.5,
        radius: 1.5
      });
    }

    const handDrawingParams = {
      left: {
        connectionColor: '#0000FF',
        landmarkColor: '#FF00FF'
      },
      right: {
        connectionColor: '#FF0000',
        landmarkColor: '#00FFFF'
      }
    };

    if (results.leftHandLandmarks) {
      drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: handDrawingParams.left.connectionColor,
        lineWidth: 2
      });

      drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: handDrawingParams.left.landmarkColor,
        lineWidth: 0.8,
        radius: 2.5
      });
    }

    if (results.rightHandLandmarks) {
      drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: handDrawingParams.right.connectionColor,
        lineWidth: 2
      });

      drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: handDrawingParams.right.landmarkColor,
        lineWidth: 0.8,
        radius: 2.5
      });
    }

    canvasCtx.restore();
  };

  const startCamera = () => {
    if (!holisticRef.current) return;

    setIsCameraActive(true);
    setVideoUrl('');

    try {
      requestAnimationFrame(() => {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!isProcessingRef.current) return;
            await holisticRef.current.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720
        });

        camera.start();
        cameraRef.current = camera;
        setIsProcessing(true);
      })
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Failed to access camera. Please ensure you have granted camera permissions and your camera is working.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsCameraActive(false);
    setIsProcessing(false);
  };

  const startProcessingVideo = () => {
    if (!holisticRef.current || !videoRef.current && !videoUrl) return;

    setIsProcessing(true);
    const processVideoFrame = () => {
      if (!isProcessing || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      holisticRef.current.send({ image: videoRef.current });
      requestAnimationFrame(processVideoFrame);
    };

    if (videoRef.current.readyState > 0) {
      processVideoFrame();
    } else {
      videoRef.current.onloadedmetadata = processVideoFrame;
    }
  };

  const stopProcessingVideo = () => {
    setIsProcessing(false);
  };

  const handleVideoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const videoUrl = URL.createObjectURL(file);

      setVideoUrl(videoUrl);
      setIsCameraActive(false);

      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    }
  };

  const handleDetectionConfidenceChange = (e) => {
    setDetectionConfidence(Number(e.target.value));
    if (holisticRef.current) {
      holisticRef.current.setOptions({ detectionConfidence: Number(e.target.value) });
    }
  };

  const handleTrackingConfidenceChange = (e) => {
    setTrackingConfidence(Number(e.target.value));
    if (holisticRef.current) {
      holisticRef.current.setOptions({ trackingConfidence: Number(e.target.value) });
    }
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 mb-8">
      <section className="mb-12 text-center max-w-3xl mx-auto">
        <h2 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-gray-800 mb-4">Human Pose Detection & Annotation</h2>
        <p className="text-gray-600 mb-8">Capture human movements and skeletal structures in real-time or from videos with advanced Mediapipe technology.</p>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-gray-600">Loading pose estimation model...</p>
          </div>
        ) : (
          <div className="video-container group">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              ></video>
            ) : videoUrl ? (
              <ReactPlayer
                ref={videoRef}
                url={videoUrl}
                width="100%"
                height="100%"
                playing={isProcessing}
                onReady={() => console.log('Video ready')}
                onError={(err) => console.error('Video error:', err)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50 text-white">
                <i className="fa fa-video-camera text-6xl mb-4 text-gray-300"></i>
                <p className="text-xl font-medium mb-2">No video selected</p>
                <p className="text-gray-300 text-sm">Upload a video or start camera to begin</p>
              </div>
            )}

            <canvas ref={canvasRef} className="canvas-overlay"></canvas>

            {isProcessing && (
              <div className="status-indicator">
                <span className="w-2 h-2 bg-white rounded-full pulse-animation"></span>
                <span>Processing</span>
              </div>
            )}

            <div className={`control-panel ${isProcessing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="detectionConfidence" className="text-sm font-medium text-gray-700">Detection Confidence</label>
                  <span className="text-xs text-gray-500">{detectionConfidence.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  id="detectionConfidence"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={detectionConfidence}
                  onChange={handleDetectionConfidenceChange}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="trackingConfidence" className="text-sm font-medium text-gray-700">Tracking Confidence</label>
                  <span className="text-xs text-gray-500">{trackingConfidence.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  id="trackingConfidence"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={trackingConfidence}
                  disabled={isProcessing}
                  onChange={handleTrackingConfidenceChange}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <i className="fa fa-video-camera text-primary text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">Real-time Camera Capture</h3>
          <p className="text-gray-600 text-sm">Use your webcam to capture and analyze human movements in real-time with skeletal annotations.</p>
          {!isCameraActive ? <button
            className="control-button control-button-primary mt-4 w-full justify-center"
            onClick={startCamera}
            disabled={isLoading || isCameraActive}
          >
            <i className="fa fa-video-camera"></i>
            <span>Start Camera</span>
          </button> :
            <button
              className="control-button control-button-secondary mt-4 w-full justify-center"
              onClick={stopCamera}
              disabled={isLoading || !isCameraActive}
            >
              <i className="fa fa-stop"></i>
              <span>Stop Camera</span>
            </button>}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <i className="fa fa-film text-secondary text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">Video File Analysis</h3>
          <p className="text-gray-600 text-sm">Upload your own videos to detect and annotate human poses and movements frame by frame.</p>
          <label htmlFor="videoUpload" className="control-button control-button-primary mt-4 w-full justify-center cursor-pointer">
            <i className="fa fa-upload"></i>
            <span>Upload Video</span>
          </label>
          <input
            type="file"
            id="videoUpload"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <i className="fa fa-magic text-purple-600 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">Pose Detection Controls</h3>
          <p className="text-gray-600 text-sm">Start or stop the pose detection process and adjust sensitivity parameters for better results.</p>
          {!isProcessing ? <button
            className="control-button control-button-primary mt-4 w-full justify-center"
            onClick={startProcessingVideo}
            disabled={isLoading || !isCameraActive && !videoUrl}
          >
            <i className="fa fa-play"></i>
            <span>Start Processing</span>
          </button> :
            <button
              className="control-button control-button-secondary mt-4 w-full justify-center"
              onClick={stopProcessingVideo}
              disabled={isLoading || !isProcessing}
            >
              <i className="fa fa-pause"></i>
              <span>Stop Processing</span>
            </button>}
        </div>
      </section>
    </main>
  );
}
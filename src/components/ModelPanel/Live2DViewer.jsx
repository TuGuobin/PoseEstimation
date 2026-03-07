import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import { Face, Pose, Hand } from 'kalidokit';

Live2DModel.registerTicker(PIXI.Ticker);

const lerp = (start, end, t) => start + (end - start) * t;

const toDegrees = (rad) => rad * (180 / Math.PI);

const PARAM_NAMES = {
  bodyX: 'ParamBodyAngleX',
  bodyY: 'ParamBodyAngleY',
  bodyZ: 'ParamBodyAngleZ',
  leftArmV: 'ParamArmLAngleV',
  leftArmH: 'ParamArmLAngleH',
  leftArmT: 'ParamArmLAngleT',
  rightArmV: 'ParamArmRAngleV',
  rightArmH: 'ParamArmRAngleH',
  rightArmT: 'ParamArmRAngleT',
  leftHand: 'ParamHandL',
  rightHand: 'ParamHandR',
  leftThumb: 'ParamFingerLThumb',
  leftIndex: 'ParamFingerLIndex',
  leftMiddle: 'ParamFingerLMiddle',
  leftRing: 'ParamFingerLRing',
  leftLittle: 'ParamFingerLLittle',
  rightThumb: 'ParamFingerRThumb',
  rightIndex: 'ParamFingerRIndex',
  rightMiddle: 'ParamFingerRMiddle',
  rightRing: 'ParamFingerRRing',
  rightLittle: 'ParamFingerRLittle',
};

export const Live2DViewer = ({ poseData, videoElement }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const originalUpdateRef = useRef(null);

  const riggedFaceRef = useRef(null);
  const riggedPoseRef = useRef(null);
  const riggedLeftHandRef = useRef(null);
  const riggedRightHandRef = useRef(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let app = null;
    let model = null;
    let wheelHandler = null;
    let resizeHandler = null;
    let canvas = null;

    const init = async () => {
      let parent = containerRef.current;
      let attempts = 0;
      while ((!parent || parent.clientWidth === 0) && attempts < 50 && isMounted) {
        await new Promise(resolve => setTimeout(resolve, 100));
        parent = containerRef.current;
        attempts++;
      }

      if (!isMounted || !parent || parent.clientWidth === 0) {
        console.error('Container element not available');
        return;
      }

      const width = parent.clientWidth || 800;
      const height = parent.clientHeight || 450;

      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      parent.appendChild(canvas);
      canvasRef.current = canvas;

      app = new PIXI.Application({
        view: canvas,
        autoStart: true,
        transparent: true,
        backgroundAlpha: 0,
        width,
        height,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      try {
        model = await Live2DModel.from('/live2d/hiyori/hiyori_pro_t10.model3.json', {
          autoInteract: false,
        });

        if (!isMounted) {
          model.destroy();
          return;
        }

        modelRef.current = model;
        originalUpdateRef.current = model.internalModel.motionManager.update.bind(model.internalModel.motionManager);

        model.scale.set(0.25);
        model.anchor.set(0.5, 0.5);
        model.position.set(width / 2, height * 0.8);

        model.interactive = true;
        model.on('pointerdown', (e) => {
          model.offsetX = e.data.global.x - model.position.x;
          model.offsetY = e.data.global.y - model.position.y;
          model.dragging = true;
        });
        model.on('pointerup', () => {
          model.dragging = false;
        });
        model.on('pointermove', (e) => {
          if (model.dragging) {
            model.position.set(
              e.data.global.x - model.offsetX,
              e.data.global.y - model.offsetY
            );
          }
        });

        wheelHandler = (e) => {
          e.preventDefault();
          const newScale = Math.max(0.1, Math.min(2, model.scale.x + e.deltaY * -0.001));
          model.scale.set(newScale);
        };
        canvas.addEventListener('wheel', wheelHandler, { passive: false });

        resizeHandler = () => {
          if (!containerRef.current || !app || !model) return;
          const newWidth = containerRef.current.clientWidth || 800;
          const newHeight = containerRef.current.clientHeight || 450;
          app.renderer.resize(newWidth, newHeight);
          model.position.set(newWidth / 2, newHeight * 0.8);
        };
        window.addEventListener('resize', resizeHandler);

        app.stage.addChild(model);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Failed to load Live2D model:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
      setIsModelLoaded(false);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (wheelHandler && canvas) canvas.removeEventListener('wheel', wheelHandler);
      if (app) app.destroy(true, { children: true, texture: true, baseTexture: true });
      if (canvas && containerRef.current && canvas.parentNode === containerRef.current) {
        containerRef.current.removeChild(canvas);
      }
      appRef.current = null;
      modelRef.current = null;
      canvasRef.current = null;
      originalUpdateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isModelLoaded || !modelRef.current) return;

    if (!poseData || !videoElement) {
      // 当 poseData 为 null 时，重置到初始状态
      riggedFaceRef.current = null;
      riggedPoseRef.current = null;
      riggedLeftHandRef.current = null;
      riggedRightHandRef.current = null;
      return;
    }

    if (poseData.faceLandmarks) {
      riggedFaceRef.current = Face.solve(poseData.faceLandmarks, {
        runtime: 'mediapipe',
        video: videoElement,
        imageSize: { width: 640, height: 480 },
        smoothBlink: true,
      });
    } else {
      riggedFaceRef.current = null;
    }

    const worldLandmarks =
      poseData.poseWorldLandmarks ??
      poseData.za ??
      poseData.ea ??
      poseData.Pa;

    if (worldLandmarks && poseData.poseLandmarks) {
      riggedPoseRef.current = Pose.solve(worldLandmarks, poseData.poseLandmarks, {
        runtime: 'mediapipe',
        video: videoElement,
      });
    } else {
      riggedPoseRef.current = null;
    }

    if (poseData.leftHandLandmarks) {
      riggedRightHandRef.current = Hand.solve(poseData.leftHandLandmarks, 'Right');
    } else {
      riggedRightHandRef.current = null;
    }

    if (poseData.rightHandLandmarks) {
      riggedLeftHandRef.current = Hand.solve(poseData.rightHandLandmarks, 'Left');
    } else {
      riggedLeftHandRef.current = null;
    }
  }, [isModelLoaded, poseData, videoElement]);

  useEffect(() => {
    if (!isModelLoaded || !modelRef.current) return;

    const model = modelRef.current;
    const coreModel = model.internalModel.coreModel;
    const originalUpdate = originalUpdateRef.current;

    model.internalModel.motionManager.update = (...args) => {
      model.internalModel.eyeBlink = undefined;

      const riggedFace = riggedFaceRef.current;
      const riggedPose = riggedPoseRef.current;
      const riggedLeftHand = riggedLeftHandRef.current;
      const riggedRightHand = riggedRightHandRef.current;

      // 如果没有姿态数据，平滑过渡回初始状态
      const resetSmooth = 0.1;

      if (!riggedFace) {
        // 重置面部参数到默认值
        coreModel.setParameterValueById('ParamEyeBallX', lerp(0, coreModel.getParameterValueById('ParamEyeBallX'), resetSmooth));
        coreModel.setParameterValueById('ParamEyeBallY', lerp(0, coreModel.getParameterValueById('ParamEyeBallY'), resetSmooth));
        coreModel.setParameterValueById('ParamAngleX', lerp(0, coreModel.getParameterValueById('ParamAngleX'), resetSmooth));
        coreModel.setParameterValueById('ParamAngleY', lerp(0, coreModel.getParameterValueById('ParamAngleY'), resetSmooth));
        coreModel.setParameterValueById('ParamAngleZ', lerp(0, coreModel.getParameterValueById('ParamAngleZ'), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.bodyX, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyX), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.bodyY, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyY), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.bodyZ, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyZ), resetSmooth));
        coreModel.setParameterValueById('ParamEyeLOpen', lerp(1, coreModel.getParameterValueById('ParamEyeLOpen'), resetSmooth));
        coreModel.setParameterValueById('ParamEyeROpen', lerp(1, coreModel.getParameterValueById('ParamEyeROpen'), resetSmooth));
        coreModel.setParameterValueById('ParamMouthOpenY', lerp(0, coreModel.getParameterValueById('ParamMouthOpenY'), resetSmooth));
        coreModel.setParameterValueById('ParamMouthForm', lerp(0.3, coreModel.getParameterValueById('ParamMouthForm'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowLY', lerp(0, coreModel.getParameterValueById('ParamBrowLY'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowRY', lerp(0, coreModel.getParameterValueById('ParamBrowRY'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowLX', lerp(0, coreModel.getParameterValueById('ParamBrowLX'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowRX', lerp(0, coreModel.getParameterValueById('ParamBrowRX'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowLAngle', lerp(0, coreModel.getParameterValueById('ParamBrowLAngle'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowRAngle', lerp(0, coreModel.getParameterValueById('ParamBrowRAngle'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowLForm', lerp(0, coreModel.getParameterValueById('ParamBrowLForm'), resetSmooth));
        coreModel.setParameterValueById('ParamBrowRForm', lerp(0, coreModel.getParameterValueById('ParamBrowRForm'), resetSmooth));
      }

      if (!riggedPose) {
        // 重置身体姿态到默认值
        coreModel.setParameterValueById(PARAM_NAMES.bodyX, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyX), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.bodyY, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyY), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.bodyZ, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.bodyZ), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftArmV, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftArmV), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftArmH, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftArmH), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftArmT, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftArmT), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightArmV, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightArmV), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightArmH, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightArmH), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightArmT, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightArmT), resetSmooth));
      }

      if (!riggedLeftHand) {
        // 重置左手到默认值
        coreModel.setParameterValueById(PARAM_NAMES.leftHand, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftHand), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftThumb, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftThumb), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftIndex, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftIndex), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftMiddle, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftMiddle), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftRing, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftRing), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.leftLittle, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.leftLittle), resetSmooth));
      }

      if (!riggedRightHand) {
        // 重置右手到默认值
        coreModel.setParameterValueById(PARAM_NAMES.rightHand, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightHand), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightThumb, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightThumb), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightIndex, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightIndex), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightMiddle, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightMiddle), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightRing, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightRing), resetSmooth));
        coreModel.setParameterValueById(PARAM_NAMES.rightLittle, lerp(0, coreModel.getParameterValueById(PARAM_NAMES.rightLittle), resetSmooth));
      }

      if (riggedFace) {
        const smooth = 0.5;
        const eyeScale = 2;

        coreModel.setParameterValueById(
          'ParamEyeBallX',
          lerp(-riggedFace.pupil.x * eyeScale, coreModel.getParameterValueById('ParamEyeBallX'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamEyeBallY',
          lerp(-riggedFace.pupil.y * eyeScale, coreModel.getParameterValueById('ParamEyeBallY'), smooth)
        );

        const headScaleX = 2;
        const headScaleY = 2;

        coreModel.setParameterValueById(
          'ParamAngleX',
          lerp(riggedFace.head.degrees.y * headScaleX, coreModel.getParameterValueById('ParamAngleX'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamAngleY',
          lerp(riggedFace.head.degrees.x * headScaleY, coreModel.getParameterValueById('ParamAngleY'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamAngleZ',
          lerp(riggedFace.head.degrees.z, coreModel.getParameterValueById('ParamAngleZ'), smooth)
        );

        const dampener = 0.3;
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyX,
          lerp(riggedFace.head.degrees.y * dampener * headScaleX, coreModel.getParameterValueById(PARAM_NAMES.bodyX), smooth)
        );
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyY,
          lerp(riggedFace.head.degrees.x * dampener * headScaleY, coreModel.getParameterValueById(PARAM_NAMES.bodyY), smooth)
        );
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyZ,
          lerp(riggedFace.head.degrees.z * dampener, coreModel.getParameterValueById(PARAM_NAMES.bodyZ), smooth)
        );

        coreModel.setParameterValueById(
          'ParamEyeLOpen',
          lerp(riggedFace.eye.l, coreModel.getParameterValueById('ParamEyeLOpen'), 0.7)
        );
        coreModel.setParameterValueById(
          'ParamEyeROpen',
          lerp(riggedFace.eye.r, coreModel.getParameterValueById('ParamEyeROpen'), 0.7)
        );

        coreModel.setParameterValueById(
          'ParamMouthOpenY',
          lerp(riggedFace.mouth.y, coreModel.getParameterValueById('ParamMouthOpenY'), 0.3)
        );
        coreModel.setParameterValueById(
          'ParamMouthForm',
          0.3 + lerp(riggedFace.mouth.x, coreModel.getParameterValueById('ParamMouthForm'), 0.3)
        );

        const browSmooth = 0.5;
        const browLY = (riggedFace.eyebrow?.left || 0) * 10;
        const browRY = (riggedFace.eyebrow?.right || 0) * 10;
        coreModel.setParameterValueById(
          'ParamBrowLY',
          lerp(browLY, coreModel.getParameterValueById('ParamBrowLY'), browSmooth)
        );
        coreModel.setParameterValueById(
          'ParamBrowRY',
          lerp(browRY, coreModel.getParameterValueById('ParamBrowRY'), browSmooth)
        );

        const browLX = -(riggedFace.head?.degrees?.y || 0) * 0.1;
        const browRX = -(riggedFace.head?.degrees?.y || 0) * 0.1;
        coreModel.setParameterValueById(
          'ParamBrowLX',
          lerp(browLX, coreModel.getParameterValueById('ParamBrowLX'), browSmooth)
        );
        coreModel.setParameterValueById(
          'ParamBrowRX',
          lerp(-browRX, coreModel.getParameterValueById('ParamBrowRX'), browSmooth)
        );

        const browAngle = -(riggedFace.head?.degrees?.z || 0) * 0.3;
        coreModel.setParameterValueById(
          'ParamBrowLAngle',
          lerp(browAngle, coreModel.getParameterValueById('ParamBrowLAngle'), browSmooth)
        );
        coreModel.setParameterValueById(
          'ParamBrowRAngle',
          lerp(-browAngle, coreModel.getParameterValueById('ParamBrowRAngle'), browSmooth)
        );

        const browForm = riggedFace.mouth?.x || 0;
        coreModel.setParameterValueById(
          'ParamBrowLForm',
          lerp(browForm, coreModel.getParameterValueById('ParamBrowLForm'), browSmooth)
        );
        coreModel.setParameterValueById(
          'ParamBrowRForm',
          lerp(browForm, coreModel.getParameterValueById('ParamBrowRForm'), browSmooth)
        );
      }

      if (riggedPose) {
        const bodySmooth = 0.6;

        if (riggedPose.Hips?.rotation) {
          const r = riggedPose.Hips.rotation;
          coreModel.setParameterValueById(
            PARAM_NAMES.bodyX,
            lerp(toDegrees(r.y) * 0.5, coreModel.getParameterValueById(PARAM_NAMES.bodyX), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.bodyY,
            lerp(toDegrees(r.x) * 0.5, coreModel.getParameterValueById(PARAM_NAMES.bodyY), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.bodyZ,
            lerp(toDegrees(r.z) * 0.5, coreModel.getParameterValueById(PARAM_NAMES.bodyZ), bodySmooth)
          );
        }

        if (riggedPose.LeftUpperArm?.rotation) {
          const arm = riggedPose.LeftUpperArm.rotation;
          coreModel.setParameterValueById(
            PARAM_NAMES.leftArmV,
            lerp(toDegrees(arm.z) * 0.8, coreModel.getParameterValueById(PARAM_NAMES.leftArmV), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.leftArmH,
            lerp(toDegrees(arm.y) * 0.5, coreModel.getParameterValueById(PARAM_NAMES.leftArmH), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.leftArmT,
            lerp(toDegrees(arm.x) * 0.3, coreModel.getParameterValueById(PARAM_NAMES.leftArmT), bodySmooth)
          );
        }

        if (riggedPose.RightUpperArm?.rotation) {
          const arm = riggedPose.RightUpperArm.rotation;
          coreModel.setParameterValueById(
            PARAM_NAMES.rightArmV,
            lerp(toDegrees(arm.z) * 0.8, coreModel.getParameterValueById(PARAM_NAMES.rightArmV), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.rightArmH,
            lerp(toDegrees(arm.y) * 0.5, coreModel.getParameterValueById(PARAM_NAMES.rightArmH), bodySmooth)
          );
          coreModel.setParameterValueById(
            PARAM_NAMES.rightArmT,
            lerp(toDegrees(arm.x) * 0.3, coreModel.getParameterValueById(PARAM_NAMES.rightArmT), bodySmooth)
          );
        }
      }

      if (riggedLeftHand) {
        const handSmooth = 0.8;

        if (riggedLeftHand.LeftWrist) {
          const wristY = Math.abs(riggedLeftHand.LeftWrist.y);
          coreModel.setParameterValueById(
            PARAM_NAMES.leftHand,
            lerp(wristY, coreModel.getParameterValueById(PARAM_NAMES.leftHand), handSmooth)
          );
        }

        const mapFinger = (fingerName, kalidoPrefix) => {
          const proximal = riggedLeftHand[`Left${kalidoPrefix}Proximal`]?.x || 0;
          const intermediate = riggedLeftHand[`Left${kalidoPrefix}Intermediate`]?.x || 0;
          const distal = riggedLeftHand[`Left${kalidoPrefix}Distal`]?.x || 0;
          const avg = (proximal + intermediate + distal) / 3;
          const value = Math.min(1, toDegrees(avg) / 90);
          coreModel.setParameterValueById(
            fingerName,
            lerp(value, coreModel.getParameterValueById(fingerName), handSmooth)
          );
        };

        mapFinger(PARAM_NAMES.leftThumb, 'Thumb');
        mapFinger(PARAM_NAMES.leftIndex, 'Index');
        mapFinger(PARAM_NAMES.leftMiddle, 'Middle');
        mapFinger(PARAM_NAMES.leftRing, 'Ring');
        mapFinger(PARAM_NAMES.leftLittle, 'Little');
      }

      if (riggedRightHand) {
        const handSmooth = 0.8;

        if (riggedRightHand.RightWrist) {
          const wristY = Math.abs(riggedRightHand.RightWrist.y);
          coreModel.setParameterValueById(
            PARAM_NAMES.rightHand,
            lerp(wristY, coreModel.getParameterValueById(PARAM_NAMES.rightHand), handSmooth)
          );
        }

        const mapFinger = (fingerName, kalidoPrefix) => {
          const proximal = riggedRightHand[`Right${kalidoPrefix}Proximal`]?.x || 0;
          const intermediate = riggedRightHand[`Right${kalidoPrefix}Intermediate`]?.x || 0;
          const distal = riggedRightHand[`Right${kalidoPrefix}Distal`]?.x || 0;
          const avg = (proximal + intermediate + distal) / 3;
          const value = Math.min(1, toDegrees(avg) / 90);
          coreModel.setParameterValueById(
            fingerName,
            lerp(value, coreModel.getParameterValueById(fingerName), handSmooth)
          );
        };

        mapFinger(PARAM_NAMES.rightThumb, 'Thumb');
        mapFinger(PARAM_NAMES.rightIndex, 'Index');
        mapFinger(PARAM_NAMES.rightMiddle, 'Middle');
        mapFinger(PARAM_NAMES.rightRing, 'Ring');
        mapFinger(PARAM_NAMES.rightLittle, 'Little');
      }
    };

    return () => {
      if (modelRef.current && originalUpdateRef.current) {
        modelRef.current.internalModel.motionManager.update = originalUpdateRef.current;
      }
    };
  }, [isModelLoaded]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};
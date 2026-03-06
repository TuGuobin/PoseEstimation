import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import { Face, Pose, Hand } from 'kalidokit';

// 注册Live2D模型到PIXI
Live2DModel.registerTicker(PIXI.Ticker);

// 插值函数
const lerp = (start, end, t) => start + (end - start) * t;

// 弧度转角度
const toDegrees = (rad) => rad * (180 / Math.PI);

// 常用Live2D参数名映射（可根据实际模型调整）
const PARAM_NAMES = {
  // 身体
  bodyX: 'ParamBodyAngleX',
  bodyY: 'ParamBodyAngleY',
  bodyZ: 'ParamBodyAngleZ',

  // 左臂
  leftArmV: 'ParamArmLAngleV',   // 垂直角度（上下）
  leftArmH: 'ParamArmLAngleH',   // 水平角度（左右）
  leftArmT: 'ParamArmLAngleT',   // 扭转角度（可选）

  // 右臂
  rightArmV: 'ParamArmRAngleV',
  rightArmH: 'ParamArmRAngleH',
  rightArmT: 'ParamArmRAngleT',

  // 手腕（手型，0~1）
  leftHand: 'ParamHandL',
  rightHand: 'ParamHandR',

  // 手指（每个手指的弯曲参数，若无则忽略）
  leftThumb:   'ParamFingerLThumb',
  leftIndex:   'ParamFingerLIndex',
  leftMiddle:  'ParamFingerLMiddle',
  leftRing:    'ParamFingerLRing',
  leftLittle:  'ParamFingerLLittle',

  rightThumb:  'ParamFingerRThumb',
  rightIndex:  'ParamFingerRIndex',
  rightMiddle: 'ParamFingerRMiddle',
  rightRing:   'ParamFingerRRing',
  rightLittle: 'ParamFingerRLittle',
};

export const Live2DViewer = ({ poseData, videoElement }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const originalUpdateRef = useRef(null);

  // 存储解算结果
  const riggedFaceRef = useRef(null);
  const riggedPoseRef = useRef(null);
  const riggedLeftHandRef = useRef(null);  // 对应真实左手（画面右手）
  const riggedRightHandRef = useRef(null); // 对应真实右手（画面左手）

  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // 初始化PIXI应用和Live2D模型（保持不变）
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let app = null;
    let model = null;
    let wheelHandler = null;
    let resizeHandler = null;
    let canvas = null;

    const init = async () => {
      // 等待父元素渲染完成
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
        // 保存原始update函数
        originalUpdateRef.current = model.internalModel.motionManager.update.bind(model.internalModel.motionManager);

        model.scale.set(0.25);
        model.anchor.set(0.5, 0.5);
        model.position.set(width / 2, height * 0.8);

        // 交互（拖拽、缩放）
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

  // 处理姿态数据：解算面部、躯干、双手
  useEffect(() => {
    if (!isModelLoaded || !modelRef.current || !poseData || !videoElement) return;

    // 面部解算
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

    // 躯干解算（兼容新版MediaPipe字段）
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

    // 手部解算（注意镜像：左手landmarks对应真实右手）
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

  // 重写update函数，应用所有追踪数据
  useEffect(() => {
    if (!isModelLoaded || !modelRef.current) return;

    const model = modelRef.current;
    const coreModel = model.internalModel.coreModel;
    const originalUpdate = originalUpdateRef.current;

    // 新的update函数
    model.internalModel.motionManager.update = (...args) => {
      // 先调用原始update，保留模型内置动画（呼吸等）
      // if (originalUpdate) originalUpdate(...args);

      // 禁用默认眨眼，由面部追踪控制
      model.internalModel.eyeBlink = undefined;

      const riggedFace = riggedFaceRef.current;
      const riggedPose = riggedPoseRef.current;
      const riggedLeftHand = riggedLeftHandRef.current;
      const riggedRightHand = riggedRightHandRef.current;

      // --- 面部参数（沿用原有逻辑，但加入平滑）---
      if (riggedFace) {
        const smooth = 0.5;

        // 视线
        coreModel.setParameterValueById(
          'ParamEyeBallX',
          lerp(riggedFace.pupil.x, coreModel.getParameterValueById('ParamEyeBallX'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamEyeBallY',
          lerp(-riggedFace.pupil.y, coreModel.getParameterValueById('ParamEyeBallY'), smooth)
        );

        // 头部角度
        coreModel.setParameterValueById(
          'ParamAngleX',
          lerp(riggedFace.head.degrees.y, coreModel.getParameterValueById('ParamAngleX'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamAngleY',
          lerp(-riggedFace.head.degrees.x, coreModel.getParameterValueById('ParamAngleY'), smooth)
        );
        coreModel.setParameterValueById(
          'ParamAngleZ',
          lerp(-riggedFace.head.degrees.z, coreModel.getParameterValueById('ParamAngleZ'), smooth)
        );

        // 身体跟随头部（轻微）
        const dampener = 0.3;
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyX,
          lerp(riggedFace.head.degrees.y * dampener, coreModel.getParameterValueById(PARAM_NAMES.bodyX), smooth)
        );
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyY,
          lerp(-riggedFace.head.degrees.x * dampener, coreModel.getParameterValueById(PARAM_NAMES.bodyY), smooth)
        );
        coreModel.setParameterValueById(
          PARAM_NAMES.bodyZ,
          lerp(-riggedFace.head.degrees.z * dampener, coreModel.getParameterValueById(PARAM_NAMES.bodyZ), smooth)
        );

        // 眼睛开合
        coreModel.setParameterValueById(
          'ParamEyeLOpen',
          lerp(riggedFace.eye.l, coreModel.getParameterValueById('ParamEyeLOpen'), 0.7)
        );
        coreModel.setParameterValueById(
          'ParamEyeROpen',
          lerp(riggedFace.eye.r, coreModel.getParameterValueById('ParamEyeROpen'), 0.7)
        );

        // 嘴巴
        coreModel.setParameterValueById(
          'ParamMouthOpenY',
          lerp(riggedFace.mouth.y, coreModel.getParameterValueById('ParamMouthOpenY'), 0.3)
        );
        coreModel.setParameterValueById(
          'ParamMouthForm',
          0.3 + lerp(riggedFace.mouth.x, coreModel.getParameterValueById('ParamMouthForm'), 0.3)
        );
      }

      // --- 躯干与四肢 ---
      if (riggedPose) {
        const bodySmooth = 0.6; // 可调

        // 身体旋转（从hips或spine获取，这里用hips近似）
        if (riggedPose.Hips?.rotation) {
          const r = riggedPose.Hips.rotation;
          // 弧度转角度，并应用阻尼
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

        // 左臂（真实左手）
        if (riggedPose.LeftUpperArm?.rotation) {
          const arm = riggedPose.LeftUpperArm.rotation;
          // 根据手臂姿态映射到V/H/T参数（需根据模型调整系数）
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

        // 右臂（真实右手）
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

      // --- 左手（真实左手） ---
      if (riggedLeftHand) {
        const handSmooth = 0.8;

        // 手腕旋转（若模型有手腕参数，可映射；这里简单映射到手型）
        if (riggedLeftHand.LeftWrist) {
          // 示例：使用手腕y轴旋转影响手型开合（可能需要更复杂的映射）
          const wristY = Math.abs(riggedLeftHand.LeftWrist.y);
          coreModel.setParameterValueById(
            PARAM_NAMES.leftHand,
            lerp(wristY, coreModel.getParameterValueById(PARAM_NAMES.leftHand), handSmooth)
          );
        }

        // 手指弯曲（每个指节的角度累加或取平均后映射到对应手指参数）
        const mapFinger = (fingerName, kalidoPrefix) => {
          const proximal = riggedLeftHand[`Left${kalidoPrefix}Proximal`]?.x || 0;
          const intermediate = riggedLeftHand[`Left${kalidoPrefix}Intermediate`]?.x || 0;
          const distal = riggedLeftHand[`Left${kalidoPrefix}Distal`]?.x || 0;
          // 平均弯曲角度（弧度转角度，归一化到0~1之间，假设最大弯曲为PI/2）
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

      // --- 右手（真实右手） ---
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
      // 组件卸载时恢复原始update，避免影响其他实例
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
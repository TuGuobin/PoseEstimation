import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Face, Hand, Pose } from "kalidokit";
import { useEffect, useRef, useCallback } from "react";
import { Euler, Object3D, Quaternion, Vector3 } from "three";
import { lerp, clamp } from "three/src/math/MathUtils.js";

const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

/**
 * 限制旋转值在合理范围，防止骨骼出现极端/反向姿态
 */
const clampRot = (val, min, max) => clamp(val, min, max);

export const VRMViewer = ({ avatarUrl, poseData, videoElement }) => {
  const { scene, userData } = useGLTF(
    avatarUrl,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser))
    }
  );

  const currentVrm = userData.vrm;
  const riggedFace      = useRef(null);
  const riggedPose      = useRef(null);
  const riggedLeftHand  = useRef(null);
  const riggedRightHand = useRef(null);

  useEffect(() => {
    if (!currentVrm) return;
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.combineSkeletons(scene);
    VRMUtils.combineMorphs(currentVrm);
    currentVrm.scene.traverse((obj) => { obj.frustumCulled = false; });
  }, [scene, currentVrm]);

  const processPoseData = useCallback((results) => {
    if (!currentVrm || !videoElement) return;

    // ── 面部 ──────────────────────────────────────────────────
    if (results.faceLandmarks) {
      riggedFace.current = Face.solve(results.faceLandmarks, {
        runtime: "mediapipe",
        video: videoElement,
        imageSize: { width: 640, height: 480 },
        smoothBlink: false,
        blinkSettings: [0.25, 0.75],
      });
    }

    // ── 躯干 ──────────────────────────────────────────────────
    // 修复 #1：results.za 是旧版 MediaPipe 内部被 minify 的属性名，
    // 新版已改为 poseWorldLandmarks，需兼容多个版本
    const worldLandmarks =
      results.poseWorldLandmarks ??
      results.za ??
      results.ea ??
      results.Pa;

    if (worldLandmarks && results.poseLandmarks) {
      riggedPose.current = Pose.solve(worldLandmarks, results.poseLandmarks, {
        runtime: "mediapipe",
        video: videoElement,
      });
    }

    // ── 手部 ──────────────────────────────────────────────────
    // 摄像头镜像修正：前置摄像头画面左右镜像，
    // MediaPipe 的 leftHandLandmarks（画面左侧）= 用户的右手
    if (results.leftHandLandmarks) {
      riggedRightHand.current = Hand.solve(results.leftHandLandmarks, "Right");
    } else {
      // 修复 #5：手离开画面时清空，避免姿态冻结
      riggedRightHand.current = null;
    }

    if (results.rightHandLandmarks) {
      riggedLeftHand.current = Hand.solve(results.rightHandLandmarks, "Left");
    } else {
      riggedLeftHand.current = null;
    }
  }, [currentVrm, videoElement]);

  useEffect(() => {
    if (poseData) processPoseData(poseData);
  }, [poseData, processPoseData]);

  // ── 表情插值 ──────────────────────────────────────────────
  const lerpExpression = (name, value, lerpFactor) => {
    if (!userData.vrm?.expressionManager) return;
    const cur = userData.vrm.expressionManager.getValue(name) ?? 0;
    userData.vrm.expressionManager.setValue(name, lerp(cur, value, lerpFactor));
  };

  /**
   * 将 KalidoKit 欧拉角应用到 VRM 标准化骨骼
   * @param {string}          boneName    - VRM humanoid 骨骼名（camelCase）
   * @param {{ x,y,z }}       value       - KalidoKit 旋转值
   * @param {number}          slerpFactor - slerp 插值量 (0~1)
   * @param {{ x,y,z }}       dampener    - 各轴缩放系数（默认全 1）
   */
  const rotateBone = (
    boneName,
    value,
    slerpFactor,
    dampener = { x: 1, y: 1, z: 1 }
  ) => {
    if (!value || !userData.vrm) return;
    const bone = userData.vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (!bone) return;

    tmpEuler.set(
      value.x * dampener.x,
      value.y * dampener.y,
      value.z * dampener.z
    );
    tmpQuat.setFromEuler(tmpEuler);
    bone.quaternion.slerp(tmpQuat, clamp(slerpFactor, 0, 1));
  };

  // ── 视线追踪 ──────────────────────────────────────────────
  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const lookAtTarget      = useRef(null);

  useEffect(() => {
    lookAtTarget.current = new Object3D();
    if (currentVrm) currentVrm.lookAt.target = lookAtTarget.current;
  }, [currentVrm]);

  // ── 每帧更新 ──────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!userData.vrm) return;

    // ── 面部 ────────────────────────────────────────────────
    if (riggedFace.current) {
      const faceSmooth = clamp(delta * 12, 0, 1);

      [
        { name: "aa",         value: riggedFace.current.mouth.shape.A },
        { name: "ih",         value: riggedFace.current.mouth.shape.I },
        { name: "ee",         value: riggedFace.current.mouth.shape.E },
        { name: "oh",         value: riggedFace.current.mouth.shape.O },
        { name: "ou",         value: riggedFace.current.mouth.shape.U },
        { name: "blinkLeft",  value: 1 - riggedFace.current.eye.l },
        { name: "blinkRight", value: 1 - riggedFace.current.eye.r },
      ].forEach(({ name, value }) => lerpExpression(name, value, faceSmooth));

      if (lookAtTarget.current) {
        lookAtDestination.current.set(
          -2 * riggedFace.current.pupil.x,
           2 * riggedFace.current.pupil.y,
          0
        );
        lookAtTarget.current.position.lerp(lookAtDestination.current, delta * 5);
      }

      rotateBone("neck", riggedFace.current.head, clamp(delta * 5, 0, 1), {
        x: 0.7, y: 0.7, z: 0.7,
      });
    }

    // ── 躯干 ────────────────────────────────────────────────
    if (riggedPose.current) {
      const bodySmooth = clamp(delta * 7, 0, 1);
      const armSmooth  = clamp(delta * 7, 0, 1);
      const handSmooth = clamp(delta * 10, 0, 1);

      rotateBone("hips", riggedPose.current.Hips.rotation, bodySmooth, {
        x: 0.7, y: 0.7, z: 0.7,
      });

      // 修复 #6：chest/spine 使用不同权重，防止腰背过度扭转
      rotateBone("chest", riggedPose.current.Spine, bodySmooth, {
        x: 0.25, y: 0.25, z: 0.25,
      });
      rotateBone("spine", riggedPose.current.Spine, bodySmooth, {
        x: 0.45, y: 0.45, z: 0.45,
      });

      // ── 手臂旋转（含 Clamp）─────────────────────────────────
      // KalidoKit UpperArm 轴约定：
      //   x = 前后摆动（sagittal plane）
      //   y = 轴向扭转
      //   z = 抬臂角度，0 = T-pose 水平，正值 = 上抬，负值 = 下垂
      //
      // 修复 #3：加入 clamp，防止极端值导致手臂飞出
      // 修复 #4：肘部 x 上限放宽到 5/6*PI，确保手可以贴近身体

      const lUA = riggedPose.current.LeftUpperArm;
      rotateBone("leftUpperArm", {
        x: clampRot(lUA.x, -Math.PI / 2,  Math.PI / 2),
        y: clampRot(lUA.y, -Math.PI / 2,  Math.PI / 2),
        // 左臂向内收（对应 z 正方向）最多到约 45°
        z: clampRot(lUA.z, -Math.PI,       Math.PI / 4),
      }, armSmooth);

      const lLA = riggedPose.current.LeftLowerArm;
      rotateBone("leftLowerArm", {
        // 允许肘部完全弯曲（~150°），确保手能贴近身体
        x: clampRot(lLA.x, -0.3,          (5 / 6) * Math.PI),
        y: clampRot(lLA.y, -Math.PI / 2,  0),
        z: clampRot(lLA.z, -Math.PI / 3,  Math.PI / 3),
      }, armSmooth);

      const rUA = riggedPose.current.RightUpperArm;
      rotateBone("rightUpperArm", {
        x: clampRot(rUA.x, -Math.PI / 2,  Math.PI / 2),
        y: clampRot(rUA.y, -Math.PI / 2,  Math.PI / 2),
        z: clampRot(rUA.z, -Math.PI / 4,  Math.PI),
      }, armSmooth);

      const rLA = riggedPose.current.RightLowerArm;
      rotateBone("rightLowerArm", {
        x: clampRot(rLA.x, -0.3,          (5 / 6) * Math.PI),
        y: clampRot(rLA.y,  0,             Math.PI / 2),
        z: clampRot(rLA.z, -Math.PI / 3,  Math.PI / 3),
      }, armSmooth);

      // ── 左手腕 + 手指 ─────────────────────────────────────
      if (riggedLeftHand.current) {
        rotateBone("leftHand", {
          z: riggedPose.current.LeftHand.z,
          y: riggedLeftHand.current.LeftWrist.y,
          x: riggedLeftHand.current.LeftWrist.x,
        }, handSmooth);

        const lh = riggedLeftHand.current;

        // 修复 #2：KalidoKit Proximal = VRM Metacarpal（掌骨），
        //         KalidoKit Intermediate = VRM Proximal（近节）
        // 原代码顺序倒置，导致拇指弯曲方向错乱及双手合十时穿透
        rotateBone("leftThumbMetacarpal",    lh.LeftThumbProximal,      handSmooth);
        rotateBone("leftThumbProximal",      lh.LeftThumbIntermediate,  handSmooth);
        rotateBone("leftThumbDistal",        lh.LeftThumbDistal,        handSmooth);

        rotateBone("leftIndexProximal",      lh.LeftIndexProximal,      handSmooth);
        rotateBone("leftIndexIntermediate",  lh.LeftIndexIntermediate,  handSmooth);
        rotateBone("leftIndexDistal",        lh.LeftIndexDistal,        handSmooth);

        rotateBone("leftMiddleProximal",     lh.LeftMiddleProximal,     handSmooth);
        rotateBone("leftMiddleIntermediate", lh.LeftMiddleIntermediate, handSmooth);
        rotateBone("leftMiddleDistal",       lh.LeftMiddleDistal,       handSmooth);

        rotateBone("leftRingProximal",       lh.LeftRingProximal,       handSmooth);
        rotateBone("leftRingIntermediate",   lh.LeftRingIntermediate,   handSmooth);
        rotateBone("leftRingDistal",         lh.LeftRingDistal,         handSmooth);

        rotateBone("leftLittleProximal",     lh.LeftLittleProximal,     handSmooth);
        rotateBone("leftLittleIntermediate", lh.LeftLittleIntermediate, handSmooth);
        rotateBone("leftLittleDistal",       lh.LeftLittleDistal,       handSmooth);
      }

      // ── 右手腕 + 手指 ─────────────────────────────────────
      if (riggedRightHand.current) {
        rotateBone("rightHand", {
          z: riggedPose.current.RightHand.z,
          y: riggedRightHand.current.RightWrist.y,
          x: riggedRightHand.current.RightWrist.x,
        }, handSmooth);

        const rh = riggedRightHand.current;

        rotateBone("rightThumbMetacarpal",    rh.RightThumbProximal,      handSmooth);
        rotateBone("rightThumbProximal",      rh.RightThumbIntermediate,  handSmooth);
        rotateBone("rightThumbDistal",        rh.RightThumbDistal,        handSmooth);

        rotateBone("rightIndexProximal",      rh.RightIndexProximal,      handSmooth);
        rotateBone("rightIndexIntermediate",  rh.RightIndexIntermediate,  handSmooth);
        rotateBone("rightIndexDistal",        rh.RightIndexDistal,        handSmooth);

        rotateBone("rightMiddleProximal",     rh.RightMiddleProximal,     handSmooth);
        rotateBone("rightMiddleIntermediate", rh.RightMiddleIntermediate, handSmooth);
        rotateBone("rightMiddleDistal",       rh.RightMiddleDistal,       handSmooth);

        rotateBone("rightRingProximal",       rh.RightRingProximal,       handSmooth);
        rotateBone("rightRingIntermediate",   rh.RightRingIntermediate,   handSmooth);
        rotateBone("rightRingDistal",         rh.RightRingDistal,         handSmooth);

        rotateBone("rightLittleProximal",     rh.RightLittleProximal,     handSmooth);
        rotateBone("rightLittleIntermediate", rh.RightLittleIntermediate, handSmooth);
        rotateBone("rightLittleDistal",       rh.RightLittleDistal,       handSmooth);
      }
    }

    userData.vrm.update(delta);
  });

  if (!currentVrm) return null;

  return (
    <primitive
      object={scene}
      rotation-y={Math.PI}
      position-y={-1.5}
      scale={2}
    />
  );
};
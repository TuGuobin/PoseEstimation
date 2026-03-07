import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Hand, Pose } from "kalidokit";
import { useEffect, useRef, useCallback } from "react";
import { Euler, Object3D, Quaternion, Vector3 } from "three";
import { lerp, clamp } from "three/src/math/MathUtils.js";

const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

const clampRot = (val, min, max) => clamp(val, min, max);

const mapBlendshapesToVRM = (faceBlendshapes) => {
  if (!faceBlendshapes || !faceBlendshapes.categories) return null;

  const blendshapes = {};
  faceBlendshapes.categories.forEach(cat => {
    blendshapes[cat.categoryName] = cat.score;
  });

  const get = (name) => blendshapes[name] || 0;
  const avg = (left, right) => (get(left) + get(right)) / 2;

  return {
    aa: get("jawOpen"),
    ih: avg("mouthSmileLeft", "mouthSmileRight"),
    ee: avg("mouthStretchLeft", "mouthStretchRight"),
    oh: get("mouthFunnel"),
    ou: get("mouthPucker"),

    blink: avg("eyeBlinkLeft", "eyeBlinkRight"),
    blinkLeft: get("eyeBlinkLeft"),
    blinkRight: get("eyeBlinkRight"),

    lookUp: avg("eyeLookUpLeft", "eyeLookUpRight"),
    lookDown: avg("eyeLookDownLeft", "eyeLookDownRight"),
    lookLeft: avg("eyeLookOutLeft", "eyeLookInRight"),
    lookRight: avg("eyeLookInLeft", "eyeLookOutRight"),

    happy: avg("mouthSmileLeft", "mouthSmileRight"),
    angry: Math.max(get("browDownLeft"), get("browDownRight")),
    sad: get("mouthFrownLeft") + get("mouthFrownRight"),
    surprised: get("browInnerUp"),
    relaxed: avg("mouthSmileLeft", "mouthSmileRight") * 0.5,
    neutral: 0,

    BrowDownLeft: get("browDownLeft"),
    BrowDownRight: get("browDownRight"),
    BrowInnerUp: get("browInnerUp"),
    BrowOuterUpLeft: get("browOuterUpLeft"),
    BrowOuterUpRight: get("browOuterUpRight"),

    CheekPuff: get("cheekPuff"),
    CheekSquintLeft: get("cheekSquintLeft"),
    CheekSquintRight: get("cheekSquintRight"),

    EyeBlinkLeft: get("eyeBlinkLeft"),
    EyeBlinkRight: get("eyeBlinkRight"),
    EyeLookDownLeft: get("eyeLookDownLeft"),
    EyeLookDownRight: get("eyeLookDownRight"),
    EyeLookInLeft: get("eyeLookInLeft"),
    EyeLookInRight: get("eyeLookInRight"),
    EyeLookOutLeft: get("eyeLookOutLeft"),
    EyeLookOutRight: get("eyeLookOutRight"),
    EyeLookUpLeft: get("eyeLookUpLeft"),
    EyeLookUpRight: get("eyeLookUpRight"),
    EyeSquintLeft: get("eyeSquintLeft"),
    EyeSquintRight: get("eyeSquintRight"),
    EyeWideLeft: get("eyeWideLeft"),
    EyeWideRight: get("eyeWideRight"),

    JawForward: get("jawForward"),
    JawLeft: get("jawLeft"),
    JawOpen: get("jawOpen"),
    JawRight: get("jawRight"),

    MouthClose: get("mouthClose"),
    MouthDimpleLeft: get("mouthDimpleLeft"),
    MouthDimpleRight: get("mouthDimpleRight"),
    MouthFrownLeft: get("mouthFrownLeft"),
    MouthFrownRight: get("mouthFrownRight"),
    MouthFunnel: get("mouthFunnel"),
    MouthLeft: get("mouthLeft"),
    MouthLowerDownLeft: get("mouthLowerDownLeft"),
    MouthLowerDownRight: get("mouthLowerDownRight"),
    MouthPressLeft: get("mouthPressLeft"),
    MouthPressRight: get("mouthPressRight"),
    MouthPucker: get("mouthPucker"),
    MouthRight: get("mouthRight"),
    MouthRollLower: get("mouthRollLower"),
    MouthRollUpper: get("mouthRollUpper"),
    MouthShrugLower: get("mouthShrugLower"),
    MouthShrugUpper: get("mouthShrugUpper"),
    MouthSmileLeft: get("mouthSmileLeft"),
    MouthSmileRight: get("mouthSmileRight"),
    MouthStretchLeft: get("mouthStretchLeft"),
    MouthStretchRight: get("mouthStretchRight"),
    MouthUpperUpLeft: get("mouthUpperUpLeft"),
    MouthUpperUpRight: get("mouthUpperUpRight"),

    NoseSneerLeft: get("noseSneerLeft"),
    NoseSneerRight: get("noseSneerRight"),

    browInnerUp: get("browInnerUp"),
    browDownLeft: get("browDownLeft"),
    browDownRight: get("browDownRight"),
    noseSneerLeft: get("noseSneerLeft"),
    noseSneerRight: get("noseSneerRight"),
    mouthFrownLeft: get("mouthFrownLeft"),
    mouthFrownRight: get("mouthFrownRight"),
    mouthSmileLeft: get("mouthSmileLeft"),
    mouthSmileRight: get("mouthSmileRight"),
    mouthPucker: get("mouthPucker"),
    mouthFunnel: get("mouthFunnel"),
    mouthRollLower: get("mouthRollLower"),
    mouthRollUpper: get("mouthRollUpper"),
    mouthShrugLower: get("mouthShrugLower"),
    mouthShrugUpper: get("mouthShrugUpper"),
    mouthClose: get("mouthClose"),
    jawForward: get("jawForward"),
    jawLeft: get("jawLeft"),
    jawRight: get("jawRight"),
    jawOpen: get("jawOpen"),
    cheekPuff: get("cheekPuff"),
    cheekSquintLeft: get("cheekSquintLeft"),
    cheekSquintRight: get("cheekSquintRight"),
    eyeWideLeft: get("eyeWideLeft"),
    eyeWideRight: get("eyeWideRight"),
    eyeSquintLeft: get("eyeSquintLeft"),
    eyeSquintRight: get("eyeSquintRight"),

    eyeLookUpLeft: get("eyeLookUpLeft"),
    eyeLookDownLeft: get("eyeLookDownLeft"),
    eyeLookInLeft: get("eyeLookInLeft"),
    eyeLookOutLeft: get("eyeLookOutLeft"),
    eyeLookUpRight: get("eyeLookUpRight"),
    eyeLookDownRight: get("eyeLookDownRight"),
    eyeLookInRight: get("eyeLookInRight"),
    eyeLookOutRight: get("eyeLookOutRight"),
  };
};

const getHeadRotationFromMatrix = (matrix) => {
  if (!matrix || !matrix.data) return null;

  const data = matrix.data;
  const m11 = data[0], m12 = data[1], m13 = data[2];
  const m21 = data[4], m22 = data[5], m23 = data[6];
  const m31 = data[8], m32 = data[9], m33 = data[10];

  let x, y, z;

  if (Math.abs(m32) < 0.9999999) {
    x = Math.asin(-clamp(m32, -1, 1));
    y = Math.atan2(m31, m33);
    z = Math.atan2(m12, m22);
  } else {
    x = Math.PI / 2 * Math.sign(m32);
    y = 0;
    z = Math.atan2(-m21, m11);
  }

  x = -x * 2;
  return { x, y, z };
};


const getPupilPosition = (blendshapes) => {
  if (!blendshapes) return { x: 0, y: 0 };

  const lookUp = (blendshapes.eyeLookUpLeft + blendshapes.eyeLookUpRight) / 2 || 0;
  const lookDown = (blendshapes.eyeLookDownLeft + blendshapes.eyeLookDownRight) / 2 || 0;
  const lookLeft = (blendshapes.eyeLookOutLeft + blendshapes.eyeLookInRight) / 2 || 0;
  const lookRight = (blendshapes.eyeLookInLeft + blendshapes.eyeLookOutRight) / 2 || 0;

  const y = lookUp - lookDown;
  const x = lookRight - lookLeft;

  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
};

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
  const faceExpressions = useRef(null);
  const headRotation = useRef(null);
  const pupilPosition = useRef({ x: 0, y: 0 });
  const riggedPose = useRef(null);
  const riggedLeftHand = useRef(null);
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

    if (results.faceBlendshapes) {
      faceExpressions.current = mapBlendshapesToVRM(results.faceBlendshapes);
    }

    if (results.faceTransformationMatrix) {
      headRotation.current = getHeadRotationFromMatrix(results.faceTransformationMatrix);
    }

    if (results.faceBlendshapes) {
      pupilPosition.current = getPupilPosition(faceExpressions.current);
    }

    const worldLandmarks = results.poseWorldLandmarks;
    const landmarks = results.poseLandmarks;

    if (worldLandmarks && landmarks && worldLandmarks.length > 0 && landmarks.length > 0) {
      try {
        riggedPose.current = Pose.solve(worldLandmarks, worldLandmarks, {
          runtime: "mediapipe",
          video: videoElement,
        });
      } catch (error) {
        console.error('Pose.solve error:', error);
        riggedPose.current = null;
      }
    } else {
      riggedPose.current = null;
    }

    if (results.leftHandLandmarks) {
      try {
        riggedRightHand.current = Hand.solve(results.leftHandLandmarks, "Right");
      } catch (error) {
        console.error('Left Hand.solve error:', error);
        riggedRightHand.current = null;
      }
    } else {
      riggedRightHand.current = null;
    }

    if (results.rightHandLandmarks) {
      try {
        riggedLeftHand.current = Hand.solve(results.rightHandLandmarks, "Left");
      } catch (error) {
        console.error('Right Hand.solve error:', error);
        riggedLeftHand.current = null;
      }
    } else {
      riggedLeftHand.current = null;
    }
  }, [currentVrm, videoElement]);

  // 重置 VRM 到初始状态
  const resetToDefaultPose = useCallback(() => {
    if (!userData.vrm) return;

    // 重置表情
    if (userData.vrm.expressionManager) {
      const expressions = userData.vrm.expressionManager.expressions;
      for (const name in expressions) {
        userData.vrm.expressionManager.setValue(name, 0);
      }
    }

    // 重置骨骼旋转
    const bones = [
      'hips', 'spine', 'chest',
      'neck', 'head',
      'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
      'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
    ];

    bones.forEach(boneName => {
      const bone = userData.vrm.humanoid?.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.quaternion.set(0, 0, 0, 1);
      }
    });

    // 重置 lookAt 目标
    if (lookAtTarget.current) {
      lookAtTarget.current.position.set(0, 0, 0);
    }

    // 清空引用
    faceExpressions.current = null;
    headRotation.current = null;
    pupilPosition.current = { x: 0, y: 0 };
    riggedPose.current = null;
    riggedLeftHand.current = null;
    riggedRightHand.current = null;
  }, [userData.vrm]);

  useEffect(() => {
    if (poseData) {
      processPoseData(poseData);
    } else {
      // 当 poseData 为 null 时，重置到初始状态
      resetToDefaultPose();
    }
  }, [poseData, processPoseData, resetToDefaultPose]);

  const lerpExpression = (name, value, lerpFactor) => {
    if (!userData.vrm?.expressionManager) return;
    const cur = userData.vrm.expressionManager.getValue(name) ?? 0;
    userData.vrm.expressionManager.setValue(name, lerp(cur, value, lerpFactor));
  };

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

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const lookAtTarget = useRef(null);

  useEffect(() => {
    lookAtTarget.current = new Object3D();
    if (currentVrm) currentVrm.lookAt.target = lookAtTarget.current;
  }, [currentVrm]);

  useFrame((_, delta) => {
    if (!userData.vrm) return;

    if (faceExpressions.current) {
      const faceSmooth = clamp(delta * 12, 0, 1);
      const expr = faceExpressions.current;

      lerpExpression("aa", expr.aa, faceSmooth);
      lerpExpression("ih", expr.ih, faceSmooth);
      lerpExpression("ee", expr.ee, faceSmooth);
      lerpExpression("oh", expr.oh, faceSmooth);
      lerpExpression("ou", expr.ou, faceSmooth);

      lerpExpression("blink", expr.blink, faceSmooth);
      lerpExpression("blinkLeft", expr.blinkLeft, faceSmooth);
      lerpExpression("blinkRight", expr.blinkRight, faceSmooth);

      lerpExpression("lookUp", expr.lookUp, faceSmooth);
      lerpExpression("lookDown", expr.lookDown, faceSmooth);
      lerpExpression("lookLeft", expr.lookLeft, faceSmooth);
      lerpExpression("lookRight", expr.lookRight, faceSmooth);

      lerpExpression("happy", expr.happy, faceSmooth);
      lerpExpression("angry", expr.angry, faceSmooth);
      lerpExpression("sad", expr.sad, faceSmooth);
      lerpExpression("surprised", expr.surprised, faceSmooth);
      lerpExpression("relaxed", expr.relaxed, faceSmooth);
      lerpExpression("neutral", expr.neutral, faceSmooth);

      lerpExpression("BrowDownLeft", expr.BrowDownLeft, faceSmooth);
      lerpExpression("BrowDownRight", expr.BrowDownRight, faceSmooth);
      lerpExpression("BrowInnerUp", expr.BrowInnerUp, faceSmooth);
      lerpExpression("BrowOuterUpLeft", expr.BrowOuterUpLeft, faceSmooth);
      lerpExpression("BrowOuterUpRight", expr.BrowOuterUpRight, faceSmooth);

      lerpExpression("CheekPuff", expr.CheekPuff, faceSmooth);
      lerpExpression("CheekSquintLeft", expr.CheekSquintLeft, faceSmooth);
      lerpExpression("CheekSquintRight", expr.CheekSquintRight, faceSmooth);

      lerpExpression("EyeBlinkLeft", expr.EyeBlinkLeft, faceSmooth);
      lerpExpression("EyeBlinkRight", expr.EyeBlinkRight, faceSmooth);
      lerpExpression("EyeLookDownLeft", expr.EyeLookDownLeft, faceSmooth);
      lerpExpression("EyeLookDownRight", expr.EyeLookDownRight, faceSmooth);
      lerpExpression("EyeLookInLeft", expr.EyeLookInLeft, faceSmooth);
      lerpExpression("EyeLookInRight", expr.EyeLookInRight, faceSmooth);
      lerpExpression("EyeLookOutLeft", expr.EyeLookOutLeft, faceSmooth);
      lerpExpression("EyeLookOutRight", expr.EyeLookOutRight, faceSmooth);
      lerpExpression("EyeLookUpLeft", expr.EyeLookUpLeft, faceSmooth);
      lerpExpression("EyeLookUpRight", expr.EyeLookUpRight, faceSmooth);
      lerpExpression("EyeSquintLeft", expr.EyeSquintLeft, faceSmooth);
      lerpExpression("EyeSquintRight", expr.EyeSquintRight, faceSmooth);
      lerpExpression("EyeWideLeft", expr.EyeWideLeft, faceSmooth);
      lerpExpression("EyeWideRight", expr.EyeWideRight, faceSmooth);

      lerpExpression("JawForward", expr.JawForward, faceSmooth);
      lerpExpression("JawLeft", expr.JawLeft, faceSmooth);
      lerpExpression("JawOpen", expr.JawOpen, faceSmooth);
      lerpExpression("JawRight", expr.JawRight, faceSmooth);

      lerpExpression("MouthClose", expr.MouthClose, faceSmooth);
      lerpExpression("MouthDimpleLeft", expr.MouthDimpleLeft, faceSmooth);
      lerpExpression("MouthDimpleRight", expr.MouthDimpleRight, faceSmooth);
      lerpExpression("MouthFrownLeft", expr.MouthFrownLeft, faceSmooth);
      lerpExpression("MouthFrownRight", expr.MouthFrownRight, faceSmooth);
      lerpExpression("MouthFunnel", expr.MouthFunnel, faceSmooth);
      lerpExpression("MouthLeft", expr.MouthLeft, faceSmooth);
      lerpExpression("MouthLowerDownLeft", expr.MouthLowerDownLeft, faceSmooth);
      lerpExpression("MouthLowerDownRight", expr.MouthLowerDownRight, faceSmooth);
      lerpExpression("MouthPressLeft", expr.MouthPressLeft, faceSmooth);
      lerpExpression("MouthPressRight", expr.MouthPressRight, faceSmooth);
      lerpExpression("MouthPucker", expr.MouthPucker, faceSmooth);
      lerpExpression("MouthRight", expr.MouthRight, faceSmooth);
      lerpExpression("MouthRollLower", expr.MouthRollLower, faceSmooth);
      lerpExpression("MouthRollUpper", expr.MouthRollUpper, faceSmooth);
      lerpExpression("MouthShrugLower", expr.MouthShrugLower, faceSmooth);
      lerpExpression("MouthShrugUpper", expr.MouthShrugUpper, faceSmooth);
      lerpExpression("MouthSmileLeft", expr.MouthSmileLeft, faceSmooth);
      lerpExpression("MouthSmileRight", expr.MouthSmileRight, faceSmooth);
      lerpExpression("MouthStretchLeft", expr.MouthStretchLeft, faceSmooth);
      lerpExpression("MouthStretchRight", expr.MouthStretchRight, faceSmooth);
      lerpExpression("MouthUpperUpLeft", expr.MouthUpperUpLeft, faceSmooth);
      lerpExpression("MouthUpperUpRight", expr.MouthUpperUpRight, faceSmooth);

      lerpExpression("NoseSneerLeft", expr.NoseSneerLeft, faceSmooth);
      lerpExpression("NoseSneerRight", expr.NoseSneerRight, faceSmooth);


      if (lookAtTarget.current) {
        lookAtDestination.current.set(
          -2 * pupilPosition.current.x,
          2 * pupilPosition.current.y,
          0
        );
        lookAtTarget.current.position.lerp(lookAtDestination.current, delta * 5);
      }
    }

    if (headRotation.current) {
      rotateBone("neck", headRotation.current, clamp(delta * 5, 0, 1), {
        x: 0.7, y: 0.7, z: 0.7,
      });
    }

    if (riggedPose.current) {
      const bodySmooth = clamp(delta * 7, 0, 1);
      const armSmooth = clamp(delta * 7, 0, 1);
      const handSmooth = clamp(delta * 10, 0, 1);

      rotateBone("hips", riggedPose.current.Hips.rotation, bodySmooth, {
        x: 0.7, y: 0.7, z: 0.7,
      });

      rotateBone("chest", riggedPose.current.Spine, bodySmooth, {
        x: 0.25, y: 0.25, z: 0.25,
      });
      rotateBone("spine", riggedPose.current.Spine, bodySmooth, {
        x: 0.45, y: 0.45, z: 0.45,
      });

      // ── 手臂旋转 ───────────────────────────────────────────
      const lUA = riggedPose.current.LeftUpperArm;
      rotateBone("leftUpperArm", {
        x: clampRot(lUA.x, -Math.PI / 2, Math.PI / 2),
        y: clampRot(lUA.y, -Math.PI / 2, Math.PI / 2),
        z: clampRot(lUA.z, -Math.PI, Math.PI / 4),
      }, armSmooth);

      const lLA = riggedPose.current.LeftLowerArm;
      rotateBone("leftLowerArm", {
        x: clampRot(lLA.x, -0.3, (5 / 6) * Math.PI),
        y: clampRot(lLA.y, -Math.PI / 2, 0),
        z: clampRot(lLA.z, -Math.PI / 3, Math.PI / 3),
      }, armSmooth);

      const rUA = riggedPose.current.RightUpperArm;
      rotateBone("rightUpperArm", {
        x: clampRot(rUA.x, -Math.PI / 2, Math.PI / 2),
        y: clampRot(rUA.y, -Math.PI / 2, Math.PI / 2),
        z: clampRot(rUA.z, -Math.PI / 4, Math.PI),
      }, armSmooth);

      const rLA = riggedPose.current.RightLowerArm;
      rotateBone("rightLowerArm", {
        x: clampRot(rLA.x, -0.3, (5 / 6) * Math.PI),
        y: clampRot(rLA.y, 0, Math.PI / 2),
        z: clampRot(rLA.z, -Math.PI / 3, Math.PI / 3),
      }, armSmooth);

      if (riggedLeftHand.current) {
        rotateBone("leftHand", {
          z: riggedPose.current.LeftHand.z,
          y: riggedLeftHand.current.LeftWrist.y,
          x: riggedLeftHand.current.LeftWrist.x,
        }, handSmooth);

        const lh = riggedLeftHand.current;

        rotateBone("leftThumbMetacarpal", lh.LeftThumbProximal, handSmooth);
        rotateBone("leftThumbProximal", lh.LeftThumbIntermediate, handSmooth);
        rotateBone("leftThumbDistal", lh.LeftThumbDistal, handSmooth);

        rotateBone("leftIndexProximal", lh.LeftIndexProximal, handSmooth);
        rotateBone("leftIndexIntermediate", lh.LeftIndexIntermediate, handSmooth);
        rotateBone("leftIndexDistal", lh.LeftIndexDistal, handSmooth);

        rotateBone("leftMiddleProximal", lh.LeftMiddleProximal, handSmooth);
        rotateBone("leftMiddleIntermediate", lh.LeftMiddleIntermediate, handSmooth);
        rotateBone("leftMiddleDistal", lh.LeftMiddleDistal, handSmooth);

        rotateBone("leftRingProximal", lh.LeftRingProximal, handSmooth);
        rotateBone("leftRingIntermediate", lh.LeftRingIntermediate, handSmooth);
        rotateBone("leftRingDistal", lh.LeftRingDistal, handSmooth);

        rotateBone("leftLittleProximal", lh.LeftLittleProximal, handSmooth);
        rotateBone("leftLittleIntermediate", lh.LeftLittleIntermediate, handSmooth);
        rotateBone("leftLittleDistal", lh.LeftLittleDistal, handSmooth);
      }

      if (riggedRightHand.current) {
        rotateBone("rightHand", {
          z: riggedPose.current.RightHand.z,
          y: riggedRightHand.current.RightWrist.y,
          x: riggedRightHand.current.RightWrist.x,
        }, handSmooth);

        const rh = riggedRightHand.current;

        rotateBone("rightThumbMetacarpal", rh.RightThumbProximal, handSmooth);
        rotateBone("rightThumbProximal", rh.RightThumbIntermediate, handSmooth);
        rotateBone("rightThumbDistal", rh.RightThumbDistal, handSmooth);

        rotateBone("rightIndexProximal", rh.RightIndexProximal, handSmooth);
        rotateBone("rightIndexIntermediate", rh.RightIndexIntermediate, handSmooth);
        rotateBone("rightIndexDistal", rh.RightIndexDistal, handSmooth);

        rotateBone("rightMiddleProximal", rh.RightMiddleProximal, handSmooth);
        rotateBone("rightMiddleIntermediate", rh.RightMiddleIntermediate, handSmooth);
        rotateBone("rightMiddleDistal", rh.RightMiddleDistal, handSmooth);

        rotateBone("rightRingProximal", rh.RightRingProximal, handSmooth);
        rotateBone("rightRingIntermediate", rh.RightRingIntermediate, handSmooth);
        rotateBone("rightRingDistal", rh.RightRingDistal, handSmooth);

        rotateBone("rightLittleProximal", rh.RightLittleProximal, handSmooth);
        rotateBone("rightLittleIntermediate", rh.RightLittleIntermediate, handSmooth);
        rotateBone("rightLittleDistal", rh.RightLittleDistal, handSmooth);
      }
    }

    userData.vrm.update(delta);
  });

  if (!currentVrm) return null;

  return (
    <primitive
      object={scene}
      position-y={-1.5}
      scale={2}
    />
  );
};

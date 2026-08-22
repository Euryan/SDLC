import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mixamoVRMRigMap } from "./mixamoVRMRigMap";

const getClip = (animations) =>
  THREE.AnimationClip.findByName(animations, "mixamo.com") || animations?.[0];

const normalizeMixamoName = (name) =>
  name.replace(/^mixamorig[:_]/i, "mixamorig").replace(/[^a-z0-9]/gi, "").toLowerCase();

const getRigBoneName = (sourceName) => {
  const normalizedName = normalizeMixamoName(sourceName);
  const entry = Object.entries(mixamoVRMRigMap).find(
    ([mixamoName]) => normalizeMixamoName(mixamoName) === normalizedName,
  );
  return entry?.[1];
};

const findSourceNode = (asset, sourceName) =>
  asset.getObjectByName(sourceName) ||
  asset.getObjectByName(sourceName.replace(/^mixamorig[:_]/i, "mixamorig"));

export const loadMixamoAnimation = async (url, vrm, { stripRootMotion = true } = {}) => {
  const asset = await new FBXLoader().loadAsync(url);
  const clip = getClip(asset.animations);
  if (!clip || !vrm?.humanoid) throw new Error("FBX tidak memiliki animation clip yang bisa dipakai.");

  const motionHips = findSourceNode(asset, "mixamorigHips");
  const vrmHipsHeight = vrm.humanoid.normalizedRestPose?.hips?.position?.[1] || 1;
  const hipsPositionScale = motionHips?.position.y ? vrmHipsHeight / motionHips.position.y : 1;
  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const sourceQuaternion = new THREE.Quaternion();

  clip.tracks.forEach((track) => {
    const [sourceName, propertyName] = track.name.split(".");
    const vrmBoneName = getRigBoneName(sourceName);
    const vrmNode = vrmBoneName && vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
    const sourceNode = findSourceNode(asset, sourceName);
    if (!vrmNode || !sourceNode || !propertyName) return;

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      sourceNode.getWorldQuaternion(restRotationInverse).invert();
      sourceNode.parent?.getWorldQuaternion(parentRestWorldRotation);
      const values = Array.from(track.values);

      for (let index = 0; index < values.length; index += 4) {
        sourceQuaternion.fromArray(values, index)
          .premultiply(parentRestWorldRotation)
          .multiply(restRotationInverse)
          .toArray(values, index);
      }

      tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNode.name}.quaternion`, track.times, values));
      return;
    }

    if (track instanceof THREE.VectorKeyframeTrack && vrmBoneName === "hips" && propertyName === "position") {
      const values = Array.from(track.values).map((value, index) => {
        const component = index % 3;
        const converted = value * hipsPositionScale;
        if (stripRootMotion && (component === 0 || component === 2)) return 0;
        return vrm.meta?.metaVersion === "0" && component !== 1 ? -converted : converted;
      });
      tracks.push(new THREE.VectorKeyframeTrack(`${vrmNode.name}.position`, track.times, values));
    }
  });

  if (!tracks.length) throw new Error("Tidak ada track Mixamo yang cocok dengan humanoid VRM.");
  return new THREE.AnimationClip(url.split("/").pop().replace(/\.fbx$/i, ""), clip.duration, tracks);
};

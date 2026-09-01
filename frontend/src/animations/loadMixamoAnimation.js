import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { fbxVRMRigMaps } from "./mixamoVRMRigMap";

const getClip = (animations) =>
  THREE.AnimationClip.findByName(animations, "mixamo.com") || animations?.[0];

const normalizeBoneName = (name, rigType) => {
  const localName = name.split("|").pop();
  const compactName = localName.replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (rigType === "mixamo") return compactName.replace(/^mixamorig/, "");
  if (rigType === "webcam") {
    if (compactName.startsWith("jbipl")) return `left${compactName.slice("jbipl".length)}`;
    if (compactName.startsWith("jbipr")) return `right${compactName.slice("jbipr".length)}`;
    return compactName.replace(/^jbipc/, "");
  }
  return compactName;
};

export const detectFbxRig = (asset) => {
  const clip = getClip(asset.animations);
  const sourceNames = clip?.tracks.map((track) => track.name.split(".")[0]) || [];
  const scores = Object.entries(fbxVRMRigMaps).map(([rigType, rigMap]) => [
    rigType,
    sourceNames.filter((sourceName) => getRigBoneName(sourceName, rigMap, rigType)).length,
  ]);
  const [rigType, score] = scores.reduce((best, candidate) => candidate[1] > best[1] ? candidate : best, ["unknown", 0]);
  return score > 0 ? rigType : "unknown";
};

const getRigBoneName = (sourceName, rigMap, rigType) => {
  const normalizedName = normalizeBoneName(sourceName, rigType);
  const entry = Object.entries(rigMap).find(
    ([rigBoneName]) => normalizeBoneName(rigBoneName, rigType) === normalizedName,
  );
  return entry?.[1];
};

const findSourceNode = (asset, sourceName) =>
  asset.getObjectByName(sourceName) ||
  asset.getObjectByName(sourceName.split("|").pop()) ||
  asset.getObjectByName(sourceName.replace(/^mixamorig[:_]/i, "mixamorig"));

const loadFbxIgnoringUnboundMorphTracks = async (url) => {
  const prototype = THREE.Object3D.prototype;
  const morphDictionaryDescriptor = Object.getOwnPropertyDescriptor(prototype, "morphTargetDictionary");

  if (!morphDictionaryDescriptor) {
    Object.defineProperty(prototype, "morphTargetDictionary", {
      configurable: true,
      value: Object.create(null),
      writable: true,
    });
  }

  try {
    const asset = await new FBXLoader().loadAsync(url);
    asset.animations.forEach((animation) => {
      animation.tracks = animation.tracks.filter(
        (track) => !track.name.includes(".morphTargetInfluences[undefined]"),
      );
    });
    return asset;
  } finally {
    if (!morphDictionaryDescriptor) delete prototype.morphTargetDictionary;
  }
};

export const getMixamoBoneReport = (asset) => {
  const clip = getClip(asset.animations);
  if (!clip) return [];
  const rigType = detectFbxRig(asset);
  const rigMap = fbxVRMRigMaps[rigType] || {};

  return clip.tracks.map((track) => {
    const [sourceName, propertyName] = track.name.split(".");
    const vrmBoneName = getRigBoneName(sourceName, rigMap, rigType);
    return {
      rigType,
      trackName: track.name,
      sourceName,
      propertyName,
      vrmBoneName: vrmBoneName || null,
      sourceNodeFound: Boolean(findSourceNode(asset, sourceName)),
    };
  });
};

export const loadMixamoAnimation = async (url, vrm, { stripRootMotion = true } = {}) => {
  const asset = await loadFbxIgnoringUnboundMorphTracks(url);
  const clip = getClip(asset.animations);
  if (!clip || !vrm?.humanoid) throw new Error("FBX tidak memiliki animation clip yang bisa dipakai.");

  const rigType = detectFbxRig(asset);
  const rigMap = fbxVRMRigMaps[rigType];
  if (!rigMap) throw new Error(`Rig FBX tidak dikenali: ${url}`);

  const boneReport = getMixamoBoneReport(asset);
  if (process.env.NODE_ENV !== "production") {
    const unmappedBones = boneReport.filter(({ vrmBoneName }) => !vrmBoneName);
    console.info(`Laporan bone FBX (${rigType}): ${url}`);
    console.table(boneReport);
    if (unmappedBones.length) {
      console.warn("Track bone FBX tanpa target VRM:", unmappedBones);
    }
  }

  const hipsSourceName = boneReport.find(({ vrmBoneName }) => vrmBoneName === "hips")?.sourceName;
  const motionHips = hipsSourceName && findSourceNode(asset, hipsSourceName);
  const vrmHipsHeight = vrm.humanoid.normalizedRestPose?.hips?.position?.[1] || 1;
  const hipsPositionScale = motionHips?.position.y ? vrmHipsHeight / motionHips.position.y : 1;
  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const sourceQuaternion = new THREE.Quaternion();

  clip.tracks.forEach((track) => {
    const [sourceName, propertyName] = track.name.split(".");
    const vrmBoneName = getRigBoneName(sourceName, rigMap, rigType);
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

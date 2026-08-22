import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from "@pixiv/three-vrm-animation";

export const loadVRMAAnimation = async (url, vrm) => {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  const gltf = await loader.loadAsync(url);
  const animation = gltf.userData.vrmAnimations?.[0];
  if (!animation) throw new Error("VRMA tidak memiliki animation clip yang dapat digunakan.");

  return createVRMAnimationClip(animation, vrm);
};

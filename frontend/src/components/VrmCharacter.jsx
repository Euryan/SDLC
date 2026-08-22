import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import lunaVrm from "../vrm/luna.vrm";
import { loadMixamoAnimation } from "../animations/loadMixamoAnimation";
import { loadVRMAAnimation } from "../animations/loadVRMAAnimation";

const VrmCharacter = ({
  animationUrl,
  animationType,
  isPlaying,
  oneShot = false,
  playTrigger = 0,
}) => {
  const canvasRef = useRef(null);
  const actionRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const playTriggerRef = useRef(playTrigger);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9bb9c2, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    let disposed = false;
    let vrm;
    let mixer;
    let nextBlinkAt = 2 + Math.random() * 3;
    let blinkUntil = 0;
    let animationFrame;
    let proceduralNodes = [];
    const clock = new THREE.Clock();

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const load = async () => {
      const gltfLoader = new GLTFLoader();
      gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await gltfLoader.loadAsync(lunaVrm);
      if (disposed) return;

      vrm = gltf.userData.vrm;
      scene.add(vrm.scene);
      vrm.expressionManager?.setValue("happy", 0.18);
      vrm.scene.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(vrm.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = Math.min(1, 2.8 / Math.max(size.y, 0.01));
      vrm.scene.scale.setScalar(scale);
      vrm.scene.position.set(-center.x * scale, -bounds.min.y * scale, 0);
      const visibleHeight = size.y * scale;
      const cameraDistance = (visibleHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
      camera.position.set(0, visibleHeight * 0.5, cameraDistance * 1.12);
      camera.lookAt(0, size.y * scale * 0.53, 0);

      proceduralNodes = [
        vrm.humanoid?.getNormalizedBoneNode("leftUpperArm"),
        vrm.humanoid?.getNormalizedBoneNode("rightUpperArm"),
        vrm.humanoid?.getNormalizedBoneNode("leftLowerArm"),
        vrm.humanoid?.getNormalizedBoneNode("rightLowerArm"),
      ].filter(Boolean).map((node) => ({ node, rotation: node.rotation.clone() }));

      try {
        const clip = animationType === "vrma"
          ? await loadVRMAAnimation(animationUrl, vrm)
          : await loadMixamoAnimation(animationUrl, vrm, { stripRootMotion: true });
        if (!disposed) {
          mixer = new THREE.AnimationMixer(vrm.scene);
          actionRef.current = mixer.clipAction(clip);
          actionRef.current.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
          actionRef.current.clampWhenFinished = oneShot;
          actionRef.current.play();
          actionRef.current.paused = !isPlayingRef.current;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.info("FBX motorik belum tersedia, memakai animasi idle.", error);
      }
    };

    load().catch((error) => {
      if (process.env.NODE_ENV !== "production") console.error("VRM gagal dimuat.", error);
    });

    const animate = () => {
      if (disposed) return;
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      if (mixer) {
        mixer.update(delta);
      } else {
        proceduralNodes.forEach(({ node, rotation }, index) => {
          node.rotation.copy(rotation);
          node.rotation.z += Math.sin(elapsed * 2.4 + index) * 0.13;
          node.rotation.x += Math.sin(elapsed * 1.8 + index) * 0.08;
        });
      }
      if (vrm?.expressionManager) {
        if (elapsed >= nextBlinkAt) {
          blinkUntil = elapsed + 0.12;
          nextBlinkAt = elapsed + 2.5 + Math.random() * 4.5;
        }
        const blinkProgress = blinkUntil > elapsed ? (elapsed - (blinkUntil - 0.12)) / 0.12 : 0;
        const blinkWeight = blinkProgress > 0 ? Math.sin(Math.min(1, blinkProgress) * Math.PI) : 0;
        vrm.expressionManager.setValue("blink", blinkWeight);
      }
      vrm?.update(delta);
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    resize();
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mixer?.stopAllAction();
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [animationUrl, animationType, oneShot]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (actionRef.current) actionRef.current.paused = !isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (playTrigger === 0 || playTrigger === playTriggerRef.current || !actionRef.current) return;
    playTriggerRef.current = playTrigger;
    actionRef.current.reset().play();
    actionRef.current.paused = !isPlayingRef.current;
  }, [playTrigger]);

  return <canvas ref={canvasRef} aria-label="Karakter Luna bergerak" className="absolute inset-0 h-full w-full" />;
};

export default VrmCharacter;

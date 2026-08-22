import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24],
  [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

const drawPoint = (context, point, width, height, color, radius = 2.5) => {
  context.fillStyle = color;
  context.beginPath();
  context.arc((1 - point.x) * width, point.y * height, radius, 0, Math.PI * 2);
  context.fill();
};

const drawConnections = (context, landmarks, connections, width, height, color) => {
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  connections.forEach(([start, end]) => {
    const from = landmarks[start];
    const to = landmarks[end];
    if (!from || !to) return;
    context.beginPath();
    context.moveTo((1 - from.x) * width, from.y * height);
    context.lineTo((1 - to.x) * width, to.y * height);
    context.stroke();
  });
};

const MediaPipeBodyEstimation = ({ onWave }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onWaveRef = useRef(onWave);
  const motionHistoryRef = useRef([]);
  const lastWaveAtRef = useRef(0);
  const [status, setStatus] = useState("Memulai kamera...");

  useEffect(() => {
    onWaveRef.current = onWave;
  }, [onWave]);

  useEffect(() => {
    let disposed = false;
    let stream;
    let animationFrame;
    let handLandmarker;
    let poseLandmarker;
    let lastVideoTime = -1;

    const detectWave = (hands, timestamp) => {
      const wrist = hands?.[0]?.[0];
      if (!wrist) {
        motionHistoryRef.current = [];
        return;
      }

      const history = motionHistoryRef.current;
      history.push({ x: wrist.x, at: timestamp });
      while (history.length && timestamp - history[0].at > 1200) history.shift();
      if (history.length < 8) return;

      const range = Math.max(...history.map((point) => point.x)) - Math.min(...history.map((point) => point.x));
      let directionChanges = 0;
      for (let index = 2; index < history.length; index += 1) {
        const previousDirection = Math.sign(history[index - 1].x - history[index - 2].x);
        const direction = Math.sign(history[index].x - history[index - 1].x);
        if (previousDirection && direction && previousDirection !== direction) directionChanges += 1;
      }

      if (range > 0.12 && directionChanges >= 2 && timestamp - lastWaveAtRef.current > 2500) {
        lastWaveAtRef.current = timestamp;
        motionHistoryRef.current = [];
        onWaveRef.current?.();
      }
    };

    const drawResults = (hands, pose) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const width = video.videoWidth || 320;
      const height = video.videoHeight || 240;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);

      pose?.landmarks?.forEach((landmarks) => {
        drawConnections(context, landmarks, POSE_CONNECTIONS, width, height, "rgba(105, 226, 197, 0.9)");
        landmarks.forEach((point) => drawPoint(context, point, width, height, "#ffffff", 2));
      });
      hands?.landmarks?.forEach((landmarks) => {
        drawConnections(context, landmarks, HAND_CONNECTIONS, width, height, "#ffcf5c");
        landmarks.forEach((point) => drawPoint(context, point, width, height, "#fff8dc", 2.5));
      });
      detectWave(hands?.landmarks, performance.now());
    };

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
        if (disposed) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        [handLandmarker, poseLandmarker] = await Promise.all([
          HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 2,
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          }),
        ]);
        if (disposed) return;
        setStatus("Lambaikan tangan untuk bergerak");

        const detect = () => {
          if (disposed) return;
          const video = videoRef.current;
          if (video?.readyState >= 2 && video.currentTime !== lastVideoTime) {
            const timestamp = performance.now();
            const hands = handLandmarker.detectForVideo(video, timestamp);
            const pose = poseLandmarker.detectForVideo(video, timestamp);
            drawResults(hands, pose);
            lastVideoTime = video.currentTime;
          }
          animationFrame = requestAnimationFrame(detect);
        };
        detect();
      } catch (error) {
        if (!disposed) setStatus("Kamera belum tersedia");
        if (process.env.NODE_ENV !== "production") console.info("MediaPipe webcam tidak tersedia.", error);
      }
    };

    run();
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      handLandmarker?.close();
      poseLandmarker?.close();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#183b46]">
      <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-[#102e38]/75 px-2 py-1 text-center font-nunito text-[10px] font-bold text-white">
        {status}
      </div>
    </div>
  );
};

export default MediaPipeBodyEstimation;

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ---------- Static data ---------- */
const FACE_IMAGES = [
  "https://dweb.link/ipfs/QmVqSPDQ3PXMfYoZN7RwfnqATXKbroegZBjxe4qYTLhKR3",
  "https://dweb.link/ipfs/QmQXMB45tfidy3YqZ9hi7A69HrgjU3jYrM5WJwwaFi93FT",
  "https://dweb.link/ipfs/QmT7Gn3h1gSgjMgh4QnxY26jytmT7JC3DHp5KbDxAzjLqi",
  "https://dweb.link/ipfs/QmdE3CSFH75ADXdJqRLuhDR9G9xaekMLSxpKasgifSrExs",
  null,
  null,
];

const FACE_LABELS = [
  "Welcome Letter",
  "AH Logo",
  "Certificate",
  "Nameplate",
  "Highlight Video",
  "Behind The Scenes",
];

const BORDER_COLORS = [
  "#CC442A",
  "#CC442A",
  "#CC442A",
  "#CC442A",
  "#0055FF",
  "#9D00FF",
];

const CHARACTER_COLORS = [
  { skin: 0xf4c8a8, hair: 0x4a2511, dress: 0xff00ff },
  { skin: 0xf4c8a8, hair: 0xffd700, dress: 0x00ffff },
  { skin: 0xf4c8a8, hair: 0xff6347, dress: 0xffff00 },
  { skin: 0xf4c8a8, hair: 0x000000, dress: 0xff0000 },
  { skin: 0xf4c8a8, hair: 0x8b4513, dress: 0x00ff00 },
];

export default function NFTCubeInterface() {
  const mountRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const starsRef = useRef(null);
  const brightStarsRef = useRef(null);
  const neonGroupRef = useRef(null);
  const edgesRef = useRef([]);
  const charactersRef = useRef([]);
  const animationIdRef = useRef(null);
  const cubeRef = useRef(null);
  const materialsRef = useRef([]);

  const videoRef = useRef(null);

  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // ---------- Flip Controller ----------
  const flipPhaseRef = useRef(0);
  const flipStepRef = useRef(0);
  const pauseTimerRef = useRef(0);

  const FLIP_SPEED = Math.PI / 60;
  const PAUSE_TIME = 700;

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;

    mountEl.style.position = "relative";
    mountEl.style.height = "100vh";
    mountEl.style.minHeight = "100vh";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b14);
    sceneRef.current = scene;

    const w = mountEl.clientWidth || window.innerWidth;
    const h = mountEl.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.set(0, -0.5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    mountEl.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    // ---------- Cube ----------
    const size = 2.04;
    const geo = new THREE.BoxGeometry(size, size, size);

    const mats = FACE_IMAGES.map((_, i) => {
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.fillStyle = "white";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.fillText(FACE_LABELS[i], 512, 512);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      return mat;
    });
    materialsRef.current = mats;

    const cube = new THREE.Mesh(geo, mats);
    cubeRef.current = cube;
    scene.add(cube);

    // ---------- Neon group ----------
    const neonGroup = new THREE.Group();
    neonGroupRef.current = neonGroup;
    scene.add(neonGroup);

    // ---------- Stars ----------
    const starsGeo = new THREE.BufferGeometry();
    const starCnt = 800;
    const pos = new Float32Array(starCnt * 3);
    for (let i = 0; i < starCnt * 3; i++) pos[i] = (Math.random() - 0.5) * 100;
    starsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const starsMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff });
    const stars = new THREE.Points(starsGeo, starsMat);
    starsRef.current = stars;
    scene.add(stars);

    // ---------- Animation loop ----------
    let last = Date.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const now = Date.now();
      let dt = now - last;
      last = now;

      dt = Math.min(dt, 32);

      const cubeLocal = cubeRef.current;
      if (!cubeLocal) return;

      // background drift
      if (starsRef.current) starsRef.current.rotation.y += 0.00006 * dt;

      // ----- Controlled Flip -----
      if (selectedFace === null && !showVideo && !showImage) {

        if (pauseTimerRef.current > 0) {
          pauseTimerRef.current -= dt;
        } else {
          const stepAngle = Math.PI / 2;

          if (flipPhaseRef.current === 0) {
            const target = flipStepRef.current * stepAngle;
            const diff = target - cubeLocal.rotation.y;

            if (Math.abs(diff) > 0.01) {
              cubeLocal.rotation.y += Math.sign(diff) * FLIP_SPEED * (1 + Math.abs(diff));
            } else {
              cubeLocal.rotation.y = target;
              flipStepRef.current++;
              if (flipStepRef.current > 3) {
                flipStepRef.current = 0;
                flipPhaseRef.current = 1;
              }
              pauseTimerRef.current = PAUSE_TIME;
            }
          }

          if (flipPhaseRef.current === 1) {
            const target = Math.PI;
            const diff = target - cubeLocal.rotation.x;

            if (Math.abs(diff) > 0.01) {
              cubeLocal.rotation.x += Math.sign(diff) * FLIP_SPEED * (1 + Math.abs(diff));
            } else {
              cubeLocal.rotation.x = target;
              flipPhaseRef.current = 2;
              pauseTimerRef.current = PAUSE_TIME;
            }
          }

          if (flipPhaseRef.current === 2) {
            const target = flipStepRef.current * stepAngle;
            const diff = target - cubeLocal.rotation.y;

            if (Math.abs(diff) > 0.01) {
              cubeLocal.rotation.y += Math.sign(diff) * FLIP_SPEED * (1 + Math.abs(diff));
            } else {
              cubeLocal.rotation.y = target;
              flipStepRef.current--;
              if (flipStepRef.current < 0) {
                flipStepRef.current = 0;
                flipPhaseRef.current = 0;
              }
              pauseTimerRef.current = PAUSE_TIME;
            }
          }
        }

        if (neonGroupRef.current) {
          neonGroupRef.current.rotation.copy(cubeLocal.rotation);
        }

        if (cameraRef.current) {
          cameraRef.current.position.x = Math.sin(cubeLocal.rotation.y) * 1.2;
          cameraRef.current.position.z = 5 + Math.cos(cubeLocal.rotation.y) * 0.3;
          cameraRef.current.lookAt(0, 0, 0);
        }
      }

      rendererRef.current.render(scene, cameraRef.current);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={mountRef} className="w-full h-screen" />
    </div>
  );
}

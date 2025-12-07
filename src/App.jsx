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

/* ---------- small helper: build a simple character group ---------- */
const createCharacter = (colors) => {
  const g = new THREE.Group();

  const skinMat = new THREE.MeshPhongMaterial({ color: colors.skin });
  const hairMat = new THREE.MeshPhongMaterial({ color: colors.hair });
  const dressMat = new THREE.MeshPhongMaterial({ color: colors.dress });
  const footMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), skinMat);
  head.position.y = 1.5;
  g.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat
  );
  hair.position.y = 1.65;
  g.add(hair);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 16), skinMat);
  torso.position.y = 0.7;
  g.add(torso);

  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 1.2, 16), dressMat);
  dress.position.y = -0.3;
  g.add(dress);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12), skinMat);
  leftArm.position.set(-0.4, 0.7, 0);
  leftArm.rotation.z = 0.3;
  g.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.set(0.4, 0.7, 0);
  rightArm.rotation.z = -0.3;
  g.add(rightArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skinMat);
  leftHand.position.set(-0.5, 0.3, 0);
  g.add(leftHand);

  const rightHand = leftHand.clone();
  rightHand.position.set(0.5, 0.3, 0);
  g.add(rightHand);

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.9, 12), skinMat);
  leftLeg.position.set(-0.15, -1.3, 0);
  g.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.set(0.15, -1.3, 0);
  g.add(rightLeg);

  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25), footMat);
  leftFoot.position.set(-0.15, -1.75, 0.05);
  g.add(leftFoot);

  const rightFoot = leftFoot.clone();
  rightFoot.position.set(0.15, -1.75, 0.05);
  g.add(rightFoot);

  return g;
};

/* ---------- main component ---------- */
export default function NFTCubeInterface() {
  const mountRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const starsRef = useRef(null);
  const brightStarsRef = useRef(null);
  const nebulaRef = useRef(null);
  const neonGroupRef = useRef(null);
  const edgesRef = useRef([]);
  const charactersRef = useRef([]);
  const animationIdRef = useRef(null);
  const cubeRef = useRef(null);

  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountEl = mountRef.current;

    /* ✅ FORCE HEIGHT FOR VITE + VERCEL */
    mountEl.style.position = "relative";
    mountEl.style.overflow = "hidden";
    mountEl.style.height = "100vh";
    mountEl.style.minHeight = "100vh";

    /* ---------- scene ---------- */
    const scene = new THREE.Scene();

    /* ✅ DEBUG BACKGROUND — REMOVE LATER */
    scene.background = new THREE.Color(0x220022);

    sceneRef.current = scene;

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = -0.5;
    cameraRef.current = camera;

    /* ✅ TRANSPARENT-SAFE RENDERER */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    rendererRef.current = renderer;
    mountEl.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    /* ---------- lights ---------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const p1 = new THREE.PointLight(0x00d4ff, 0.5, 50);
    p1.position.set(3, 3, 3);
    scene.add(p1);

    const p2 = new THREE.PointLight(0x00ffff, 0.4, 50);
    p2.position.set(-3, 2, -3);
    scene.add(p2);

    /* ---------- astronomy background ---------- */
    const addBackground = () => {
      const starCount = 2000;
      const pos = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const idx = i * 3;
        pos[idx] = (Math.random() - 0.5) * 100;
        pos[idx + 1] = (Math.random() - 0.5) * 100;
        pos[idx + 2] = (Math.random() - 0.5) * 100;
        colors[idx] = colors[idx + 1] = colors[idx + 2] = 0.8 + Math.random() * 0.2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true });
      const points = new THREE.Points(g, mat);
      scene.add(points);
      starsRef.current = points;
    };

    addBackground();

    /* ---------- Cube ---------- */
    const cubeSize = 2.04;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    const materials = FACE_IMAGES.map(
      (_, i) => new THREE.MeshPhongMaterial({ color: new THREE.Color(BORDER_COLORS[i] || "#222") })
    );

    const cube = new THREE.Mesh(cubeGeometry, materials);
    cubeRef.current = cube;
    scene.add(cube);

    /* ---------- click handler ---------- */
    const onClick = (ev) => {
      const rect = mountEl.getBoundingClientRect();
      mouseRef.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(cube, false);

      if (intersects.length > 0) {
        const faceIndex =
          intersects[0].face?.materialIndex ??
          Math.floor(intersects[0].faceIndex / 2);

        if (faceIndex === 4 || faceIndex === 5) {
          setSelectedFace(faceIndex);
          setShowVideo(true);
          setShowImage(false);
        } else {
          setSelectedFace(faceIndex);
          setShowVideo(false);
          setShowImage(true);
        }
      }
    };

    mountEl.addEventListener("click", onClick);

    /* ---------- resize ---------- */
    const onResize = () => {
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ---------- render loop ---------- */
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (cube) {
        cube.rotation.x += 0.003;
        cube.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
    };
    animate();

    /* ---------- cleanup ---------- */
    return () => {
      mountEl.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentBorderColor =
    selectedFace !== null
      ? BORDER_COLORS[selectedFace]
      : "rgba(204,68,42,0.5)";

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden font-sans">
      <div
        ref={mountRef}
        className="w-full h-screen"
        style={{ minHeight: "100vh" }}
      />
    </div>
  );
}

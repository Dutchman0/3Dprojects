import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ---------- Static data ---------- */
const FACE_IMAGES = [
  "https://dweb.link/ipfs/QmQXMB45tfidy3YqZ9hi7A69HrgjU3jYrM5WJwwaFi93FT",
  "https://dweb.link/ipfs/QmabyjpYL5YFgQPkey4JX9V2x9L8WbbMK7YKPKyx5ftEfH",
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

/* ---------- per-face video URLs (index 4 and 5 are the video faces) ---------- */
const FACE_VIDEOS = [
  null,
  null,
  null,
  null,
  "https://dweb.link/ipfs/QmWwJGxtuGmGWVUnQes2DYQvidQDNfCYrjAaw37iYCiVMN",
  "https://dweb.link/ipfs/QmTPriMCheQZ6H7uvPo1kQB2uoWYWQkpQViYdgr7rwSri7",
];

const CHARACTER_COLORS = [
  { skin: 0xf4c8a8, hair: 0x4a2511, dress: 0xff00ff },
  { skin: 0xf4c8a8, hair: 0xffd700, dress: 0x00ffff },
  { skin: 0xf4c8a8, hair: 0xff6347, dress: 0xffff00 },
  { skin: 0xf4c8a8, hair: 0x000000, dress: 0xff0000 },
  { skin: 0xf4c8a8, hair: 0x8b4513, dress: 0x00ff00 },
];

/* ---------- Initial per-face orientation (from your JSON) ----------
   Indexes 0..5 correspond to faces 1..6.
*/
const INITIAL_FACE_ORIENTATIONS = [
  { rotDeg: 0, flipX: true, flipY: false },
  { rotDeg: 0, flipX: true, flipY: false },
  { rotDeg: 0, flipX: false, flipY: false },
  { rotDeg: 0, flipX: false, flipY: false },
  { rotDeg: 0, flipX: false, flipY: false },
  { rotDeg: 0, flipX: false, flipY: false },
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

/* ---------- helper: draw overlay + text into canvas ---------- */
function drawFaceCanvas({ index, faceImageBitmap = null, width = 1024, height = 1024 }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // background gradient
  if (faceImageBitmap) {
    try {
      ctx.drawImage(faceImageBitmap, 0, 0, width, height);
    } catch (e) {
      ctx.fillStyle = "#001133";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, BORDER_COLORS[index] || "#222");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // border
  ctx.strokeStyle = BORDER_COLORS[index] || "#fff";
  ctx.lineWidth = Math.max(6, width * 0.015);
  ctx.strokeRect(10, 10, width - 20, height - 20);

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(2, width * 0.005);
  ctx.strokeRect(26, 26, width - 52, height - 52);

  // text
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 10;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `bold ${Math.round(width * 0.06)}px Arial`;
  ctx.fillText("Tommy DeVito", width / 2, Math.round(height * 0.22));
  ctx.font = `bold ${Math.round(width * 0.045)}px Arial`;
  ctx.fillText(FACE_LABELS[index] || `Face ${index + 1}`, width / 2, Math.round(height * 0.32));
  ctx.font = `${Math.round(width * 0.03)}px Arial`;
  ctx.fillText(`Face ${index + 1}`, width / 2, Math.round(height * 0.42));
  ctx.shadowBlur = 0;

  return canvas;
}

/* ---------- per-face texture rotation helper ----------
   BoxGeometry material order: +X(0), -X(1), +Y(2), -Y(3), +Z(4), -Z(5).
*/
function getTextureRotationForFace(index) {
  switch (index) {
    case 0: return Math.PI / 2;
    case 1: return -Math.PI / 2;
    case 2: return Math.PI;
    case 3: return 0;
    case 4: return 0;
    case 5: return Math.PI;
    default: return 0;
  }
}

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

  const materialsRef = useRef([]);
  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const videoRef = useRef(null);

  const [autoFlip, setAutoFlip] = useState(true);
  const autoFlipRef = useRef(autoFlip);

  const inactivityTimeoutRef = useRef(null);
  const fetchControllersRef = useRef(new Set());
  const scheduledLoadTimeoutsRef = useRef([]);
  const lastPointerInteractionRef = useRef(0);

  // Per-face orientation state (initialized from your JSON)
  const [faceOrientation, setFaceOrientation] = useState(INITIAL_FACE_ORIENTATIONS);
  const faceOrientationRef = useRef(faceOrientation);
  useEffect(() => { faceOrientationRef.current = faceOrientation; }, [faceOrientation]);

  useEffect(() => { autoFlipRef.current = autoFlip; }, [autoFlip]);

  // Compose and apply user orientation onto a CanvasTexture
  const applyOrientationToTexture = (index, tex) => {
    if (!tex) return;
    const baseRotation = -getTextureRotationForFace(index); // keep previous sign convention
    const orient = faceOrientationRef.current[index] || { rotDeg: 0, flipX: false, flipY: false };

    const userRad = ((orient.rotDeg % 360) + 360) % 360 * (Math.PI / 180);
    tex.center = new THREE.Vector2(0.5, 0.5);
    tex.rotation = baseRotation + userRad;

    // baseline repeat.x = -1 from original code; apply user's flips on top
    const baselineRepeatX = -1;
    const repeatX = baselineRepeatX * (orient.flipX ? -1 : 1);
    const repeatY = orient.flipY ? -1 : 1;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);

    tex.flipY = false;
  };

  const updateFaceOrientation = (index, patch) => {
    setFaceOrientation((prev) => {
      const next = prev.map((p) => ({ ...p }));
      const before = next[index] || { rotDeg: 0, flipX: false, flipY: false };
      next[index] = { ...before, ...(typeof patch === "function" ? patch(before) : patch) };
      faceOrientationRef.current = next;
      // immediate apply if material present
      try {
        const mats = materialsRef.current;
        if (mats && mats[index] && mats[index].map) {
          applyOrientationToTexture(index, mats[index].map);
          mats[index].needsUpdate = true;
        }
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;

    // ensure layout sizing
    mountEl.style.position = mountEl.style.position || "relative";
    mountEl.style.overflow = mountEl.style.overflow || "hidden";
    mountEl.style.height = mountEl.style.height || "100vh";
    mountEl.style.minHeight = mountEl.style.minHeight || "100vh";

    const SNOOZE_MS = 5000;
    const clearInactivityTimer = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };
    const scheduleResumeAutoFlip = () => {
      clearInactivityTimer();
      inactivityTimeoutRef.current = setTimeout(() => {
        setAutoFlip(true);
        inactivityTimeoutRef.current = null;
      }, SNOOZE_MS);
    };
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastPointerInteractionRef.current < 120) {
        if (!inactivityTimeoutRef.current) scheduleResumeAutoFlip();
        return;
      }
      lastPointerInteractionRef.current = now;
      if (autoFlipRef.current) setAutoFlip(false);
      scheduleResumeAutoFlip();
    };
    mountEl.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    mountEl.addEventListener("pointermove", handleUserInteraction, { passive: true });

    /* ---------- three.js setup ---------- */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b14);
    sceneRef.current = scene;

    const width = Math.max(1, mountEl.clientWidth || window.innerWidth);
    const height = Math.max(1, mountEl.clientHeight || window.innerHeight);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = -0.5;
    cameraRef.current = camera;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    rendererRef.current = renderer;
    mountEl.appendChild(renderer.domElement);

    const onContextLost = (e) => {
      e.preventDefault();
      console.warn("WebGL context lost");
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const p1 = new THREE.PointLight(0x00d4ff, 0.3, 50);
    p1.position.set(3, 3, 3);
    scene.add(p1);

    const p2 = new THREE.PointLight(0x00ffff, 0.2, 50);
    p2.position.set(-3, 2, -3);
    scene.add(p2);

    /* ---------- background stars ---------- */
    const addBackground = () => {
      const starCount = 900;
      const pos = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const idx = i * 3;
        pos[idx] = (Math.random() - 0.5) * 100;
        pos[idx + 1] = (Math.random() - 0.5) * 100;
        pos[idx + 2] = (Math.random() - 0.5) * 100;
        const v = 0.75 + Math.random() * 0.25;
        colors[idx] = colors[idx + 1] = colors[idx + 2] = v;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.95 });
      const points = new THREE.Points(g, mat);
      scene.add(points);
      starsRef.current = points;

      const brightCount = 120;
      const bpos = new Float32Array(brightCount * 3);
      for (let i = 0; i < brightCount; i++) {
        const idx = i * 3;
        bpos[idx] = (Math.random() - 0.5) * 100;
        bpos[idx + 1] = (Math.random() - 0.5) * 100;
        bpos[idx + 2] = (Math.random() - 0.5) * 100;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
      const bmat = new THREE.PointsMaterial({ size: 0.24, color: 0xffffff, transparent: true, opacity: 1 });
      const bpoints = new THREE.Points(bg, bmat);
      scene.add(bpoints);
      brightStarsRef.current = bpoints;
    };

    addBackground();

    /* ---------- cube & materials ---------- */
    const cubeSize = 2.04;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    const placeholderMaterials = FACE_IMAGES.map((_, i) => {
      const placeholderCanvas = drawFaceCanvas({ index: i, faceImageBitmap: null, width: 1024, height: 1024 });
      const placeholderTexture = new THREE.CanvasTexture(placeholderCanvas);
      placeholderTexture.encoding = THREE.sRGBEncoding;
      placeholderTexture.flipY = false;
      placeholderTexture.wrapS = THREE.RepeatWrapping;
      placeholderTexture.wrapT = THREE.RepeatWrapping;
      placeholderTexture.repeat.set(-1, 1); // baseline mirror
      placeholderTexture.center = new THREE.Vector2(0.5, 0.5);
      placeholderTexture.rotation = -getTextureRotationForFace(i);

      // apply user's initial orientation on top of baseline
      try { applyOrientationToTexture(i, placeholderTexture); } catch (e) {}

      const mat = new THREE.MeshPhongMaterial({ map: placeholderTexture, transparent: false });
      return mat;
    });
    materialsRef.current = placeholderMaterials;

    const cube = new THREE.Mesh(cubeGeometry, placeholderMaterials);
    cubeRef.current = cube;
    scene.add(cube);

    /* ---------- neon frames ---------- */
    const neonGroup = new THREE.Group();
    neonGroupRef.current = neonGroup;

    const edgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8);
    const edges = [];
    edgesRef.current = edges;

    const createFaceFrame = (position, rotation) => {
      const frameGroup = new THREE.Group();
      const frameEdges = [
        { pos: [0, 0.85, 0], rot: [0, 0, Math.PI / 2] },
        { pos: [0, -0.85, 0], rot: [0, 0, Math.PI / 2] },
        { pos: [-0.85, 0, 0], rot: [0, 0, 0] },
        { pos: [0.85, 0, 0], rot: [0, 0, 0] },
      ];
      frameEdges.forEach((e) => {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 1 });
        const edgeMesh = new THREE.Mesh(edgeGeo, mat);
        edgeMesh.position.set(...e.pos);
        edgeMesh.rotation.set(...e.rot);
        edges.push(edgeMesh);
        frameGroup.add(edgeMesh);

        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(edgeGeo.clone(), glowMat);
        glow.scale.multiplyScalar(1.3);
        edgeMesh.add(glow);
      });
      frameGroup.position.copy(position);
      frameGroup.rotation.set(rotation.x, rotation.y, rotation.z);
      return frameGroup;
    };

    const faceFrames = [
      { pos: new THREE.Vector3(0, 0, cubeSize / 2 + 0.02), rot: new THREE.Euler(0, 0, 0) },
      { pos: new THREE.Vector3(0, 0, -cubeSize / 2 - 0.02), rot: new THREE.Euler(0, Math.PI, 0) },
      { pos: new THREE.Vector3(cubeSize / 2 + 0.02, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) },
      { pos: new THREE.Vector3(-cubeSize / 2 - 0.02, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) },
      { pos: new THREE.Vector3(0, cubeSize / 2 + 0.02, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) },
      { pos: new THREE.Vector3(0, -cubeSize / 2 - 0.02, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) },
    ];

    faceFrames.forEach((f) => neonGroup.add(createFaceFrame(f.pos, f.rot)));
    cube.add(neonGroup);

    /* ---------- characters ---------- */
    const characters = CHARACTER_COLORS.slice(0, 5).map((c, i) => {
      const char = createCharacter(c);
      char.scale.set(0.01, 0.01, 0.01);
      char.position.y = -0.5;
      char.position.x = (i - 2) * 0.6;
      scene.add(char);
      return char;
    });
    charactersRef.current = characters;

    /* ---------- loader that applies orientation when textures are created ---------- */
    const loadFaceTexture = async (index, url, material) => {
      const controller = new AbortController();
      fetchControllersRef.current.add(controller);
      try {
        if (!url) {
          const canvas = drawFaceCanvas({ index, faceImageBitmap: null, width: 1024, height: 1024 });
          const tex = new THREE.CanvasTexture(canvas);
          tex.encoding = THREE.sRGBEncoding;
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(-1, 1);
          tex.center = new THREE.Vector2(0.5, 0.5);
          tex.rotation = -getTextureRotationForFace(index);
          applyOrientationToTexture(index, tex);
          material.map && material.map.dispose();
          material.map = tex;
          material.needsUpdate = true;
          return;
        }

        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(url, { mode: "cors", signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error("Fetch failed");
        const blob = await resp.blob();
        let bitmap = null;
        try { bitmap = await createImageBitmap(blob); } catch (err) { bitmap = null; }
        const canvas = drawFaceCanvas({ index, faceImageBitmap: bitmap, width: 1024, height: 1024 });
        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        tex.flipY = false;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(-1, 1);
        tex.center = new THREE.Vector2(0.5, 0.5);
        tex.rotation = -getTextureRotationForFace(index);
        applyOrientationToTexture(index, tex);
        if (material.map) {
          try { if (material.map.dispose) material.map.dispose(); } catch (e) {}
        }
        material.map = tex;
        material.needsUpdate = true;
      } catch (err) {
        try {
          const canvas = drawFaceCanvas({ index, faceImageBitmap: null, width: 1024, height: 1024 });
          const tex = new THREE.CanvasTexture(canvas);
          tex.encoding = THREE.sRGBEncoding;
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(-1, 1);
          tex.center = new THREE.Vector2(0.5, 0.5);
          tex.rotation = -getTextureRotationForFace(index);
          applyOrientationToTexture(index, tex);
          if (material.map) {
            try { if (material.map.dispose) material.map.dispose(); } catch (e) {}
          }
          material.map = tex;
          material.needsUpdate = true;
        } catch (e) {}
      } finally {
        fetchControllersRef.current.delete(controller);
      }
    };

    // start loading face textures
    placeholderMaterials.forEach((mat, idx) => {
      const t = setTimeout(() => loadFaceTexture(idx, FACE_IMAGES[idx], mat), idx * 150);
      scheduledLoadTimeoutsRef.current.push(t);
    });

    /* ---------- interactions: click to inspect ---------- */
    const onClick = (ev) => {
      handleUserInteraction();
      if (!mountEl) return;
      const rect = mountEl.getBoundingClientRect();
      mouseRef.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      const rc = raycasterRef.current;
      const cam = cameraRef.current;
      if (!rc || !cam || !cubeRef.current) return;
      rc.setFromCamera(mouseRef.current, cam);
      const intersects = rc.intersectObject(cubeRef.current, false);
      if (intersects && intersects.length > 0) {
        const faceIndex =
          intersects[0].face && typeof intersects[0].face.materialIndex === "number"
            ? intersects[0].face.materialIndex
            : Math.floor(intersects[0].faceIndex / 2);
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
      if (!mountEl) return;
      const w = Math.max(1, mountEl.clientWidth);
      const h = Math.max(1, mountEl.clientHeight);
      const cam = cameraRef.current;
      const rend = rendererRef.current;
      if (!cam || !rend) return;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      rend.setSize(w, h, false);
    };
    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mountEl);
    } else {
      window.addEventListener("resize", onResize);
    }

    /* ---------- animation ---------- */
    let last = Date.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const now = Date.now();
      const dt = now - last;
      last = now;

      if (starsRef.current) starsRef.current.rotation.y += 0.00006 * dt;
      if (brightStarsRef.current) brightStarsRef.current.rotation.y += 0.00011 * dt;
      if (nebulaRef.current) {
        nebulaRef.current.rotation.y += 0.000004 * dt;
        nebulaRef.current.rotation.x += 0.00002 * dt;
      }

      const cubeLocal = cubeRef.current;
      if (!cubeLocal) return;

      if (selectedFace === null && !showVideo && !showImage) {
        const pulse = Math.sin(now * 0.003) * 0.3 + 0.7;
        edgesRef.current.forEach((edge) => {
          if (edge.material) edge.material.opacity = pulse;
        });
        cubeLocal.scale.setScalar(1);
        if (neonGroupRef.current) neonGroupRef.current.scale.setScalar(1);
        if (Array.isArray(cubeLocal.material)) cubeLocal.material.forEach((m) => { if (m) m.opacity = 1; });
        charactersRef.current.forEach((ch) => ch.scale.setScalar(0.01));
      } else if (selectedFace !== null) {
        if (charactersRef.current[selectedFace]) {
          charactersRef.current[selectedFace].rotation.y += 0.01 * dt;
        }
      }

      const rend = rendererRef.current;
      const cam = cameraRef.current;
      if (rend && cam) rend.render(scene, cam);
    };
    animate();

    /* ---------- cleanup ---------- */
    return () => {
      mountEl.removeEventListener("click", onClick);
      mountEl.removeEventListener("pointerdown", handleUserInteraction);
      mountEl.removeEventListener("pointermove", handleUserInteraction);

      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", onResize);

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }

      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);

      try {
        fetchControllersRef.current.forEach((c) => { try { c.abort(); } catch (e) {} });
        fetchControllersRef.current.clear();
      } catch (e) {}

      try {
        scheduledLoadTimeoutsRef.current.forEach((t) => clearTimeout(t));
        scheduledLoadTimeoutsRef.current = [];
      } catch (e) {}

      try {
        if (starsRef.current) {
          if (starsRef.current.geometry) starsRef.current.geometry.dispose();
          if (starsRef.current.material) starsRef.current.material.dispose();
          scene.remove(starsRef.current);
        }
        if (brightStarsRef.current) {
          if (brightStarsRef.current.geometry) brightStarsRef.current.geometry.dispose();
          if (brightStarsRef.current.material) brightStarsRef.current.material.dispose();
          scene.remove(brightStarsRef.current);
        }
        if (nebulaRef.current) {
          if (nebulaRef.current.geometry) nebulaRef.current.geometry.dispose();
          if (nebulaRef.current.material) {
            if (nebulaRef.current.material.map) nebulaRef.current.material.map.dispose();
            nebulaRef.current.material.dispose();
          }
          scene.remove(nebulaRef.current);
        }

        const cubeToDispose = cubeRef.current;
        if (cubeToDispose) {
          if (cubeToDispose.geometry) cubeToDispose.geometry.dispose();
          if (Array.isArray(cubeToDispose.material)) {
            cubeToDispose.material.forEach((m) => {
              if (!m) return;
              if (m.map) { try { m.map.dispose(); } catch (e) {} }
              try { if (m.dispose) m.dispose(); } catch (e) {}
            });
          } else if (cubeToDispose.material) {
            try { if (cubeToDispose.material.map) cubeToDispose.material.map.dispose(); } catch (e) {}
            try { if (cubeToDispose.material.dispose) cubeToDispose.material.dispose(); } catch (e) {}
          }
          scene.remove(cubeToDispose);
        }

        edgesRef.current.forEach((edge) => {
          if (edge.geometry) edge.geometry.dispose();
          if (edge.material) edge.material.dispose();
          if (edge.parent) edge.parent.remove(edge);
        });

        charactersRef.current.forEach((char) => {
          char.traverse((obj) => {
            if (obj.isMesh) {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m) => { if (m.map) m.map.dispose(); if (m.dispose) m.dispose(); });
                } else {
                  if (obj.material.map) obj.material.map.dispose();
                  if (obj.material.dispose) obj.material.dispose();
                }
              }
            }
          });
          if (char.parent) char.parent.remove(char);
        });

        try {
          materialsRef.current.forEach((m) => {
            if (!m) return;
            if (m.map) { try { m.map.dispose(); } catch (e) {} }
            try { if (m.dispose) m.dispose(); } catch (e) {}
          });
        } catch (e) {}

        if (rendererRef.current) {
          try { rendererRef.current.dispose(); } catch (e) {}
          if (rendererRef.current.domElement && mountEl.contains(rendererRef.current.domElement)) {
            try { rendererRef.current.domElement.removeEventListener("webglcontextlost", onContextLost); } catch (e) {}
            try { mountEl.removeChild(rendererRef.current.domElement); } catch (e) {}
          }
        }
      } catch (err) {
        // final safety
      }
    };
  }, []); // run once

  /* ---------- camera / cube transition when selectedFace changes ---------- */
  useEffect(() => {
    const cube = cubeRef.current;
    const neonGroup = neonGroupRef.current;
    const characters = charactersRef.current || [];
    const camera = cameraRef.current;
    if (!cube || !camera || !neonGroup) return;

    const start = Date.now();
    const duration = 700;
    const fromZ = camera.position.z;
    const toZ = selectedFace === null && !showVideo && !showImage ? 5 : 4.0;
    const fromY = camera.position.y;
    const toY = selectedFace === null && !showVideo && !showImage ? -0.5 : 0;
    const startCubeScale = cube.scale.x;
    const endCubeScale = selectedFace === null && !showVideo && !showImage ? 1 : 0.01;

    let raf = null;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.z = fromZ + (toZ - fromZ) * ease;
      camera.position.y = fromY + (toY - fromY) * ease;

      const s = startCubeScale + (endCubeScale - startCubeScale) * ease;
      cube.scale.setScalar(s);
      neonGroup.scale.setScalar(s);

      if (Array.isArray(cube.material)) cube.material.forEach((m) => { if (m) m.opacity = 0.9 * (1 - ease) + 0.1; });

      characters.forEach((ch, idx) => {
        if (selectedFace !== null && idx === selectedFace) {
          const cs = 0.01 + ease * 0.99;
          ch.scale.setScalar(cs);
        } else {
          ch.scale.setScalar(0.01);
        }
      });

      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [selectedFace, showVideo, showImage]);

  // face target rotations
  const faceTargetRotations = [
    { x: 0, y: -Math.PI / 2 },
    { x: 0, y: Math.PI / 2 },
    { x: Math.PI / 2, y: 0 },
    { x: -Math.PI / 2, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: Math.PI },
  ];

  const currentBorderColor = selectedFace !== null ? BORDER_COLORS[selectedFace] : "rgba(204,68,42,0.5)";

  /* ---------- auto flip loop (phase-based) ---------- */
  useEffect(() => {
    if (!autoFlip || showImage || showVideo) return;
    const cube = cubeRef.current;
    if (!cube) return;
    let cancelled = false;

    const imageFaces = [];
    const videoFaces = [];
    for (let i = 0; i < FACE_IMAGES.length; i++) {
      if (i === 4 || i === 5) videoFaces.push(i);
      else if (FACE_IMAGES[i]) imageFaces.push(i);
    }

    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const animateRotationTo = (target, dur = 1400) => {
      return new Promise((res) => {
        const startRot = { x: cube.rotation.x, y: cube.rotation.y };
        const start = performance.now();
        const step = (now) => {
          if (cancelled || !autoFlipRef.current) return res();
          const tRaw = Math.min(1, (now - start) / dur);
          const ease = easeInOutCubic(tRaw);
          cube.rotation.x = startRot.x + (target.x - startRot.x) * ease;
          cube.rotation.y = startRot.y + (target.y - startRot.y) * ease;
          if (tRaw < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });
    };

    const animateDeltaX = (delta, dur = 1200) => {
      return new Promise((res) => {
        const startX = cube.rotation.x;
        const start = performance.now();
        const step = (now) => {
          if (cancelled || !autoFlipRef.current) return res();
          const tRaw = Math.min(1, (now - start) / dur);
          const ease = easeInOutCubic(tRaw);
          cube.rotation.x = startX + delta * ease;
          if (tRaw < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });
    };

    (async () => {
      let phase = "images";
      while (!cancelled && autoFlipRef.current) {
        if (phase === "images") {
          if (imageFaces.length === 0) { phase = "videos"; continue; }
          for (let idx of imageFaces) {
            if (cancelled || !autoFlipRef.current) break;
            const target = faceTargetRotations[idx];
            await animateRotationTo(target, 1400);
            await wait(800);
            await wait(1200);
          }
          phase = "videos";
        } else {
          if (videoFaces.length === 0) { phase = "images"; continue; }
          for (let idx of videoFaces) {
            if (cancelled || !autoFlipRef.current) break;
            const target = faceTargetRotations[idx];
            await animateRotationTo(target, 1400);
            await animateDeltaX(Math.PI, 1200);
            await wait(1600);
            await animateDeltaX(-Math.PI, 1200);
            await wait(1000);
          }
          phase = "images";
        }
      }
    })();

    return () => { cancelled = true; };
  }, [autoFlip, showImage, showVideo]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden font-sans">
      <div ref={mountRef} className="w-full h-screen" style={{ minHeight: "100vh" }} />

      {showImage && selectedFace !== null && FACE_IMAGES[selectedFace] && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-30 p-4">
          <div
            className="relative w-full max-w-5xl rounded-xl p-2"
            style={{
              boxShadow: `0 0 40px 10px ${currentBorderColor}`,
              borderColor: currentBorderColor,
              borderStyle: "solid",
              borderWidth: "4px",
            }}
          >
            <img
              src={FACE_IMAGES[selectedFace]}
              alt={FACE_LABELS[selectedFace]}
              className="w-full h-auto rounded-lg max-h-[85vh] object-contain"
              crossOrigin="anonymous"
            />

            {/* Orientation controls (affect cube face texture immediately) */}
            <div className="absolute left-4 bottom-4 z-50 bg-black bg-opacity-70 p-3 rounded-md flex gap-2 items-center">
              <button
                title="Rotate left 90°"
                onClick={() => updateFaceOrientation(selectedFace, (o) => ({ ...o, rotDeg: (o.rotDeg - 90 + 360) % 360 }))}
                className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                ↺
              </button>
              <button
                title="Rotate right 90°"
                onClick={() => updateFaceOrientation(selectedFace, (o) => ({ ...o, rotDeg: (o.rotDeg + 90) % 360 }))}
                className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                ↻
              </button>

              <button
                title="Flip horizontal"
                onClick={() => updateFaceOrientation(selectedFace, (o) => ({ ...o, flipX: !o.flipX }))}
                className={`px-2 py-1 rounded ${faceOrientation[selectedFace] && faceOrientation[selectedFace].flipX ? "bg-blue-600 text-white" : "bg-gray-800 text-white"} hover:opacity-90`}
              >
                ⇋
              </button>

              <button
                title="Flip vertical"
                onClick={() => updateFaceOrientation(selectedFace, (o) => ({ ...o, flipY: !o.flipY }))}
                className={`px-2 py-1 rounded ${faceOrientation[selectedFace] && faceOrientation[selectedFace].flipY ? "bg-blue-600 text-white" : "bg-gray-800 text-white"} hover:opacity-90`}
              >
                ⇵
              </button>

              <button
                title="Reset orientation"
                onClick={() => updateFaceOrientation(selectedFace, { rotDeg: 0, flipX: false, flipY: false })}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Reset
              </button>
              <div className="text-xs text-gray-200 ml-2">
                {faceOrientation[selectedFace] ? `${faceOrientation[selectedFace].rotDeg}°` : "0°"}
              </div>
            </div>

            <button
              onClick={() => {
                setShowImage(false);
                setSelectedFace(null);
                if (inactivityTimeoutRef.current) {
                  clearTimeout(inactivityTimeoutRef.current);
                  inactivityTimeoutRef.current = null;
                }
                setAutoFlip(true);
              }}
              className="absolute -top-4 -right-4 w-10 h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-105 shadow-xl flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showVideo && selectedFace !== null && FACE_VIDEOS[selectedFace] && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-30 p-4">
          <div
            className="relative w-full max-w-4xl rounded-xl p-2"
            style={{
              boxShadow: `0 0 40px 10px ${currentBorderColor}`,
              borderColor: currentBorderColor,
              borderStyle: "solid",
              borderWidth: "4px",
            }}
          >
            <video
              key={selectedFace}
              ref={videoRef}
              className="w-full rounded-lg"
              controls
              autoPlay
              src={FACE_VIDEOS[selectedFace]}
            >
              Your browser does not support the video tag.
            </video>

            <button
              onClick={() => {
                setShowVideo(false);
                setSelectedFace(null);
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
                setAutoFlip(true);
              }}
              className="absolute -top-4 -right-4 w-10 h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-105 shadow-xl flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 md:top-8 md:left-8 text-white max-w-xs md:max-w-md backdrop-blur-sm bg-black/30 p-4 rounded-xl border border-white/20 shadow-lg z-40">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-300 tracking-wider">
          DeVito NFT Viewer
        </h1>
        <p className="text-sm md:text-base text-gray-200">Click any cube face to zoom in on the exclusive memorabilia.</p>
        <p className="text-xs md:text-sm text-gray-400 mt-2">Faces 5 & 6 (blue & purple) are special videos!</p>
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <h2 className="text-sm font-bold mb-2 text-cyan-300">Cube Faces:</h2>
          <div className="space-y-1 text-xs md:text-sm">
            {FACE_LABELS.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: BORDER_COLORS[idx] }}
                />
                <span className="text-gray-300">
                  <strong>Face {idx + 1}:</strong> {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(selectedFace !== null || showVideo || showImage) && (
        <button
          onClick={() => {
            setSelectedFace(null);
            setShowVideo(false);
            setShowImage(false);
            setAutoFlip(true);
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-8 py-3 text-sm md:text-base bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-full hover:scale-105 shadow-xl z-40"
        >
          <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
          </svg>
          Return to Flip-Through
        </button>
      )}

      <div
        className="absolute top-4 right-4 md:top-8 md:right-8 bg-black bg-opacity-60 p-4 md:p-6 rounded-xl text-white text-sm md:text-base border-2 transition-all duration-300 shadow-2xl w-48 md:w-64 z-40"
        style={{ borderColor: currentBorderColor, boxShadow: `0 0 15px ${currentBorderColor}` }}
      >
        <h3 className="font-extrabold mb-2 text-lg md:text-xl" style={{ color: currentBorderColor }}>
          {showVideo ? FACE_LABELS[selectedFace] : selectedFace !== null ? FACE_LABELS[selectedFace] : "NFT Collection Status"}
        </h3>

        {showVideo ? (
          <>
            <p className="text-gray-300">Type: <strong>Interactive Video</strong></p>
            <p className="text-gray-300">Face: <strong>#{selectedFace + 1}</strong></p>
            <p className="text-gray-300">Content: <strong>{selectedFace === 4 ? "Gameday Highlights" : "Behind The Scenes"}</strong></p>
          </>
        ) : showImage ? (
          <>
            <p className="text-gray-300">Type: <strong>NFT Image</strong></p>
            <p className="text-gray-300">Edition: <strong>#{selectedFace + 1}/6</strong></p>
            <p className="text-gray-300">Rarity: <strong>Legendary</strong></p>
            <p className="text-gray-300 mt-2">Viewing: <strong style={{ color: BORDER_COLORS[selectedFace] }}>{FACE_LABELS[selectedFace]}</strong></p>
            <p className="text-xs text-gray-400 mt-2">Use the rotate / flip controls when viewing the image to change how it appears on the cube face.</p>
          </>
        ) : selectedFace !== null ? (
          <>
            <p className="text-gray-300">Type: <strong>3D Character NFT</strong></p>
            <p className="text-gray-300">Edition: <strong>#{selectedFace + 1}/6</strong></p>
            <p className="text-gray-300">Rarity: <strong>Legendary</strong></p>
            <p className="text-gray-300 mt-2">Viewed Character: <strong style={{ color: BORDER_COLORS[selectedFace] }}>{BORDER_COLORS[selectedFace]}</strong></p>
          </>
        ) : (
          <>
            <p className="text-gray-300">Total Pieces: <strong>6/6</strong></p>
            <p className="text-gray-300">Click to Inspect</p>
            <p className="text-gray-500 mt-4 text-xs">A Three.js + React showcase with neon borders.</p>
          </>
        )}
      </div>
    </div>
  );
}

// keep for future stage-level transforms
function stageScene(scene) {
  return scene;
}


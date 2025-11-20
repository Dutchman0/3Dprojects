import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * NFTCubeInterface - Fixed & cleaned-up Three.js React component
 *
 * Notes on fixes:
 * - CanvasTexture is created before any img.onload uses it (texture.needsUpdate safe).
 * - Raycast uses intersect.face.materialIndex (accurate box face index 0..5).
 * - All disposable resources are disposed on unmount to avoid memory leaks.
 * - Robust image onerror fallback and texture.needsUpdate called in all branches.
 * - Safer guard checks when accessing characters by index.
 */

/* ---------- Static data (same as original, but can be passed as props) ---------- */
const FACE_IMAGES = [
  "https://dweb.link/ipfs/QmVqSPDQ3PXMfYoZN7RwfnqATXKbroegZBjxe4qYTLhKR3",
  "https://dweb.link/ipfs/QmQXMB45tfidy3YqZ9hi7A69HrgjU3jYrM5WJwwaFi93FT",
  "https://dweb.link/ipfs/QmT7Gn3h1gSgjMgh4QnxY26jytmT7JC3DHp5KbDxAzjLqi",
  "https://dweb.link/ipfs/QmdE3CSFH75ADXdJqRLuhDR9G9xaekMLSxpKasgifSrExs",
  "https://dweb.link/ipfs/QmVqSPDQ3PXMfYoZN7RwfnqATXKbroegZBjxe4qYTLhKR3",
  null,
];

const FACE_LABELS = [
  "Welcome Letter",
  "AH Logo",
  "Certificate",
  "Nameplate",
  "Jersey #15",
  "Highlight Video",
];

const BORDER_COLORS = [
  "#CC442A",
  "#CC442A",
  "#CC442A",
  "#CC442A",
  "#CC442A",
  "#0055FF",
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

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
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

  const cubeRef = useRef(null);
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

  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    /* ---------- scene, camera, renderer ---------- */
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

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

    /* ---------- Add starfield & nebula ---------- */
    const addBackground = () => {
      // small stars
      const starCount = 2000;
      const pos = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const idx = i * 3;
        pos[idx] = (Math.random() - 0.5) * 100;
        pos[idx + 1] = (Math.random() - 0.5) * 100;
        pos[idx + 2] = (Math.random() - 0.5) * 100;
        const c = Math.random();
        colors[idx] = colors[idx + 1] = colors[idx + 2] = 0.8 + Math.random() * 0.2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.9 });
      const points = new THREE.Points(g, mat);
      scene.add(points);
      starsRef.current = points;

      // bright stars
      const brightCount = 250;
      const bpos = new Float32Array(brightCount * 3);
      for (let i = 0; i < brightCount; i++) {
        const idx = i * 3;
        bpos[idx] = (Math.random() - 0.5) * 100;
        bpos[idx + 1] = (Math.random() - 0.5) * 100;
        bpos[idx + 2] = (Math.random() - 0.5) * 100;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
      const bmat = new THREE.PointsMaterial({ size: 0.28, color: 0xffffff, transparent: true, opacity: 1 });
      const bpoints = new THREE.Points(bg, bmat);
      scene.add(bpoints);
      brightStarsRef.current = bpoints;

      // simple nebula using canvas texture (soft)
      const nebulaCount = 500;
      const npos = new Float32Array(nebulaCount * 3);
      const ncolors = new Float32Array(nebulaCount * 3);
      for (let i = 0; i < nebulaCount; i++) {
        const idx = i * 3;
        npos[idx] = (Math.random() - 0.5) * 60;
        npos[idx + 1] = (Math.random() - 0.5) * 60;
        npos[idx + 2] = (Math.random() - 0.5) * 60 - 20;
        ncolors[idx] = 0.4 + Math.random() * 0.6;
        ncolors[idx + 1] = 0.2 + Math.random() * 0.5;
        ncolors[idx + 2] = 0.6 + Math.random() * 0.4;
      }
      const ng = new THREE.BufferGeometry();
      ng.setAttribute("position", new THREE.BufferAttribute(npos, 3));
      ng.setAttribute("color", new THREE.BufferAttribute(ncolors, 3));

      const nebulaCanvas = document.createElement("canvas");
      nebulaCanvas.width = 64;
      nebulaCanvas.height = 64;
      const nctx = nebulaCanvas.getContext("2d");
      const gradient = nctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.6, "rgba(255,255,255,0.2)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      nctx.fillStyle = gradient;
      nctx.fillRect(0, 0, 64, 64);
      const ntex = new THREE.CanvasTexture(nebulaCanvas);

      const nmat = new THREE.PointsMaterial({
        size: 2,
        map: ntex,
        vertexColors: true,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const npoints = new THREE.Points(ng, nmat);
      scene.add(npoints);
      nebulaRef.current = npoints;
    };

    addBackground();

    /* ---------- Cube & materials ---------- */
    const cubeSize = 2.04;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // helper - create a canvas-based material safely (texture exists before onload uses it)
    const createFaceMaterial = (index, faceImageURL) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      const texture = new THREE.CanvasTexture(canvas);

      const drawOverlay = (bgFill = null) => {
        // background
        if (bgFill) {
          ctx.fillStyle = bgFill;
          ctx.fillRect(0, 0, 512, 512);
        } else {
          // default gradient
          const g = ctx.createLinearGradient(0, 0, 512, 512);
          g.addColorStop(0, BORDER_COLORS[index] || "#222");
          g.addColorStop(1, "#000000");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 512, 512);
        }

        // border/frame
        ctx.strokeStyle = BORDER_COLORS[index] || "#fff";
        ctx.lineWidth = 16;
        ctx.strokeRect(10, 10, 492, 492);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 4;
        ctx.strokeRect(26, 26, 460, 460);

        // text overlay
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "bold 48px Arial";
        ctx.fillText("Tommy DeVito", 256, 200);
        ctx.font = "bold 36px Arial";
        ctx.fillText(FACE_LABELS[index] || `Face ${index + 1}`, 256, 260);
        ctx.font = "24px Arial";
        ctx.fillText(`Face ${index + 1}`, 256, 320);
        ctx.shadowBlur = 0;
      };

      // If image present, draw it then overlay; else draw placeholder
      if (faceImageURL) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            ctx.clearRect(0, 0, 512, 512);
            ctx.drawImage(img, 0, 0, 512, 512);
          } catch (err) {
            // if cross-origin or draw fails, fallback to gradient
            ctx.clearRect(0, 0, 512, 512);
            drawOverlay("#111");
          }
          drawOverlay();
          texture.needsUpdate = true;
        };
        img.onerror = () => {
          console.warn(`Face image ${index} failed to load. Using fallback.`);
          drawOverlay("#111");
          texture.needsUpdate = true;
        };
        // set src after handlers
        img.src = faceImageURL;
      } else {
        // fallback face (video / special face)
        drawOverlay("#001133");
        texture.needsUpdate = true;
      }

      return new THREE.MeshPhongMaterial({ map: texture, transparent: false, opacity: 1 });
    };

    const materials = FACE_IMAGES.map((url, idx) => createFaceMaterial(idx, url));
    const cube = new THREE.Mesh(cubeGeometry, materials);
    cubeRef.current = cube;
    scene.add(cube);

    /* ---------- neon border frames ---------- */
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

        // soft glow copy (back side)
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.28, side: THREE.BackSide });
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

    faceFrames.forEach((f) => {
      neonGroup.add(createFaceFrame(f.pos, f.rot));
    });
    scene.add(neonGroup);

    /* ---------- characters (small, simple models) ---------- */
    const characters = CHARACTER_COLORS.slice(0, 5).map((c, i) => {
      const char = createCharacter(c);
      char.scale.set(0.01, 0.01, 0.01); // start tiny
      char.position.y = -0.5;
      // spread them horizontally under cube
      char.position.x = (i - 2) * 0.6;
      scene.add(char);
      return char;
    });
    charactersRef.current = characters;

    /* ---------- interaction handlers ---------- */
    const onClick = (ev) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      // intersect with cube (use recursive=false)
      const intersects = raycaster.intersectObject(cube, false);
      if (intersects && intersects.length > 0) {
        // use face.materialIndex rather than faceIndex/2 (robust)
        const faceIndex = intersects[0].face && typeof intersects[0].face.materialIndex === "number"
          ? intersects[0].face.materialIndex
          : Math.floor(intersects[0].faceIndex / 2);
        if (faceIndex === 5) {
          setSelectedFace(null);
          setShowVideo(true);
        } else {
          setSelectedFace(faceIndex);
          setShowVideo(false);
        }
      }
    };

    mountRef.current.addEventListener("click", onClick);

    /* ---------- resize ---------- */
    const onResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // small mobile tweak
      camera.position.z = w < 768 ? 6 : 5;
    };
    window.addEventListener("resize", onResize);

    /* ---------- animation loop ---------- */
    let last = Date.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const now = Date.now();
      const dt = now - last;
      last = now;

      // background motions
      if (starsRef.current) starsRef.current.rotation.y += 0.0002 * dt;
      if (brightStarsRef.current) brightStarsRef.current.rotation.y += 0.00035 * dt;
      if (nebulaRef.current) {
        nebulaRef.current.rotation.y += 0.00012 * dt;
        nebulaRef.current.rotation.x += 0.00006 * dt;
      }

      // cube or character motion
      if (selectedFace === null && !showVideo) {
        cube.rotation.x += 0.0012 * dt;
        cube.rotation.y += 0.0024 * dt;
        neonGroup.rotation.copy(cube.rotation);

        // pulse neon
        const pulse = Math.sin(now * 0.003) * 0.3 + 0.7;
        edgesRef.current.forEach((edge) => {
          if (edge.material) edge.material.opacity = pulse;
        });

        // ensure cube visible
        cube.scale.setScalar(1);
        neonGroup.scale.setScalar(1);
        cube.material.forEach((m) => { if (m) m.opacity = 1; });

        // characters minimized
        charactersRef.current.forEach((ch) => ch.scale.setScalar(0.01));
      } else if (selectedFace !== null) {
        // spin viewed character
        if (charactersRef.current[selectedFace]) {
          charactersRef.current[selectedFace].rotation.y += 0.01 * dt;
        }
        // animate camera slightly back
      } else if (showVideo) {
        // video modal active - keep cube minimized
      }

      renderer.render(scene, camera);
    };
    animate();

    /* ---------- cleanup on unmount ---------- */
    return () => {
      // listeners
      mountRef.current?.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);

      // cancel animation
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);

      // dispose geometries and materials
      try {
        // dispose stars
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

        // cube geometry and materials
        if (cube) {
          if (cube.geometry) cube.geometry.dispose();
          if (Array.isArray(cube.material)) {
            cube.material.forEach((m) => {
              if (!m) return;
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else if (cube.material) {
            if (cube.material.map) cube.material.map.dispose();
            cube.material.dispose();
          }
          scene.remove(cube);
        }

        // neon edges
        edgesRef.current.forEach((edge) => {
          if (edge.geometry) edge.geometry.dispose();
          if (edge.material) edge.material.dispose();
          if (edge.parent) edge.parent.remove(edge);
        });

        // characters (dispose their materials if accessible)
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

        // dispose renderer
        renderer.dispose();
        // remove DOM
        mountRef.current?.removeChild(renderer.domElement);
      } catch (err) {
        // swallow cleanup errors
        // console.warn("Error during Three.js cleanup:", err);
      }
    };
  }, []); // mount only

  /* ---------- Animate transitions when selection changes ---------- */
  useEffect(() => {
    const cube = cubeRef.current;
    const neonGroup = neonGroupRef.current;
    const characters = charactersRef.current || [];
    const camera = cameraRef.current;
    if (!cube || !camera || !neonGroup) return;

    // animate camera & scaling using a small JS easing loop (no external deps)
    const start = Date.now();
    const duration = 700;
    const fromZ = camera.position.z;
    const toZ = selectedFace === null && !showVideo ? 5 : 4.0;
    const fromY = camera.position.y;
    const toY = selectedFace === null && !showVideo ? -0.5 : 0;
    const startCubeScale = cube.scale.x;
    const endCubeScale = selectedFace === null && !showVideo ? 1 : 0.01;

    let raf = null;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.z = fromZ + (toZ - fromZ) * ease;
      camera.position.y = fromY + (toY - fromY) * ease;

      // cube scale
      const s = startCubeScale + (endCubeScale - startCubeScale) * ease;
      cube.scale.setScalar(s);
      neonGroup.scale.setScalar(s);

      // fade cube face materials a bit when zoomed
      if (Array.isArray(cube.material)) cube.material.forEach((m) => { if (m) m.opacity = 0.9 * (1 - ease) + 0.1; });

      // if selected face, grow that character
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
  }, [selectedFace, showVideo]);

  const currentBorderColor = selectedFace !== null ? BORDER_COLORS[selectedFace] : showVideo ? BORDER_COLORS[5] : "rgba(204,68,42,0.5)";

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden font-sans">
      <div ref={mountRef} className="w-full h-full" />

      {showVideo && (
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
              ref={videoRef}
              className="w-full rounded-lg"
              controls
              autoPlay
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
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
              }}
              className="absolute -top-4 -right-4 w-10 h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-105 shadow-xl flex items-center justify-center text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 md:top-8 md:left-8 text-white max-w-xs md:max-w-none backdrop-blur-sm bg-black/30 p-4 rounded-xl border border-white/20 shadow-lg">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-300 tracking-wider">
          DeVito NFT Viewer
        </h1>
        <p className="text-sm md:text-base text-gray-200">Click any cube face to zoom in on the exclusive memorabilia.</p>
        <p className="text-xs md:text-sm text-gray-400 mt-2">Face 6 (The blue face) is a special Highlight Video!</p>
      </div>

      {(selectedFace !== null || showVideo) && (
        <button
          onClick={() => {
            setSelectedFace(null);
            setShowVideo(false);
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-8 py-3 text-sm md:text-base bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl z-20"
        >
          <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
          </svg>
          Return to Spinning Cube
        </button>
      )}

      <div
        className="absolute top-4 right-4 md:top-8 md:right-8 bg-black bg-opacity-60 p-4 md:p-6 rounded-xl text-white text-sm md:text-base border-2 transition-all duration-300 shadow-2xl w-48 md:w-64"
        style={{ borderColor: currentBorderColor, boxShadow: `0 0 15px ${currentBorderColor}` }}
      >
        <h3 className="font-extrabold mb-2 text-lg md:text-xl" style={{ color: currentBorderColor }}>
          {selectedFace !== null || showVideo ? FACE_LABELS[selectedFace !== null ? selectedFace : 5] : "NFT Collection Status"}
        </h3>

        {showVideo ? (
          <>
            <p className="text-gray-300">Type: <strong>Interactive Video</strong></p>
            <p className="text-gray-300">Face: <strong>#6 (Back)</strong></p>
            <p className="text-gray-300">Event: <strong>Gameday Highlights</strong></p>
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

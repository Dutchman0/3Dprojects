import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// --- Static Data Definitions (Moved outside component) ---
const FACE_IMAGES = [
  'https://dweb.link/ipfs/QmVqSPDQ3PXMfYoZN7RwfnqATXKbroegZBjxe4qYTLhKR3', // Face 0: Welcome Letter
  'https://dweb.link/ipfs/QmQXMB45tfidy3YqZ9hi7A69HrgjU3jYrM5WJwwaFi93FT', // Face 1: AH Logo
  'https://dweb.link/ipfs/QmT7Gn3h1gSgjMgh4QnxY26jytmT7JC3DHp5KbDxAzjLqi', // Face 2: Certificate
  'https://dweb.link/ipfs/QmdE3CSFH75ADXdJqRLuhDR9G9xaekMLSxpKasgifSrExs', // Face 3: Nameplate
  'https://dweb.link/ipfs/QmVqSPDQ3PXMfYoZN7RwfnqATXKbroegZBjxe4qYTLhKR3', // Face 4: Jersey #15
];

const CHARACTER_COLORS = [
  { skin: 0xf4c8a8, hair: 0x4a2511, dress: 0xff00ff }, // Face 0: Magenta
  { skin: 0xf4c8a8, hair: 0xffd700, dress: 0x00ffff }, // Face 1: Cyan
  { skin: 0xf4c8a8, hair: 0xff6347, dress: 0xffff00 }, // Face 2: Yellow
  { skin: 0xf4c8a8, hair: 0x000000, dress: 0xff0000 }, // Face 3: Red
  { skin: 0xf4c8a8, hair: 0x8b4513, dress: 0x00ff00 }, // Face 4: Green
  { skin: 0xf4c8a8, hair: 0x0000ff, dress: 0x0066FF }, // Face 5: Blue (Video)
];

const BORDER_COLORS = ['#CC442A', '#CC442A', '#CC442A', '#CC442A', '#CC442A', '#CC442A'];

const FACE_LABELS = ['Welcome Letter', 'AH Logo', 'Certificate', 'Nameplate', 'Jersey #15', 'Highlight Video'];

// --- Utility Function: 3D Character Builder (Moved outside component) ---
const createCharacter = (colors) => {
  const character = new THREE.Group();
  
  const skinMaterial = new THREE.MeshPhongMaterial({ color: colors.skin });
  const hairMaterial = new THREE.MeshPhongMaterial({ color: colors.hair });
  const dressMaterial = new THREE.MeshPhongMaterial({ color: colors.dress });

  // Head and Hair
  const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.y = 1.5;
  character.add(head);

  const hairGeometry = new THREE.SphereGeometry(0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const hair = new THREE.Mesh(hairGeometry, hairMaterial);
  hair.position.y = 1.65;
  character.add(hair);

  // Torso and Dress
  const torsoGeometry = new THREE.CylinderGeometry(0.35, 0.3, 0.8, 32);
  const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
  torso.position.y = 0.7;
  character.add(torso);

  const dressGeometry = new THREE.CylinderGeometry(0.3, 0.6, 1.2, 32);
  const dress = new THREE.Mesh(dressGeometry, dressMaterial);
  dress.position.y = -0.3;
  character.add(dress);

  // Arms
  const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
  const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
  leftArm.position.set(-0.4, 0.7, 0);
  leftArm.rotation.z = 0.3;
  character.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
  rightArm.position.set(0.4, 0.7, 0);
  rightArm.rotation.z = -0.3;
  character.add(rightArm);

  // Hands
  const handGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
  leftHand.position.set(-0.5, 0.3, 0);
  character.add(leftHand);

  const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
  rightHand.position.set(0.5, 0.3, 0);
  character.add(rightHand);

  // Legs and Feet
  const legGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.9, 16);
  const leftLeg = new THREE.Mesh(legGeometry, skinMaterial);
  leftLeg.position.set(-0.15, -1.3, 0);
  character.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, skinMaterial);
  rightLeg.position.set(0.15, -1.3, 0);
  character.add(rightLeg);

  const footGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.25);
  const footMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
  leftFoot.position.set(-0.15, -1.75, 0.05);
  character.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
  rightFoot.position.set(0.15, -1.75, 0.05);
  character.add(rightFoot);

  return character;
};


// --- Main React Component ---
export default function NFTCubeInterface() {
  const mountRef = useRef(null);
  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  
  // Three.js object refs
  const videoRef = useRef(null);
  const cubeRef = useRef(null);
  const neonBorderRef = useRef(null);
  const charactersRef = useRef([]);
  const cameraRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const starsRef = useRef(null);
  const brightStarsRef = useRef(null);
  const nebulaRef = useRef(null);

  // Effect for setting up the Three.js scene (Runs once on mount)
  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x8844ff, 1, 100);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff44ff, 0.8, 100);
    pointLight2.position.set(-3, 2, -3);
    scene.add(pointLight2);
    
    // --- Background (Stars & Nebula) ---
    const addBackground = () => {
      // Stars
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 2000;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 100;
        starPositions[i + 1] = (Math.random() - 0.5) * 100;
        starPositions[i + 2] = (Math.random() - 0.5) * 100;
        
        const c = Math.random();
        starColors[i] = c < 0.7 ? 1 : (c < 0.85 ? 0.8 : 1);
        starColors[i + 1] = c < 0.7 ? 1 : (c < 0.85 ? 0.9 : 0.95);
        starColors[i + 2] = c < 0.7 ? 1 : (c < 0.85 ? 1 : 0.8);
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
      
      const starMaterial = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.8 });
      starsRef.current = new THREE.Points(starGeometry, starMaterial);
      scene.add(starsRef.current);
      
      // Bright Stars
      const brightStarGeometry = new THREE.BufferGeometry();
      const brightStarCount = 200;
      const brightStarPositions = new Float32Array(brightStarCount * 3);
      for (let i = 0; i < brightStarCount * 3; i += 3) {
        brightStarPositions[i] = (Math.random() - 0.5) * 100;
        brightStarPositions[i + 1] = (Math.random() - 0.5) * 100;
        brightStarPositions[i + 2] = (Math.random() - 0.5) * 100;
      }
      brightStarGeometry.setAttribute('position', new THREE.BufferAttribute(brightStarPositions, 3));
      const brightStarMaterial = new THREE.PointsMaterial({ size: 0.3, color: 0xffffff, transparent: true, opacity: 1 });
      brightStarsRef.current = new THREE.Points(brightStarGeometry, brightStarMaterial);
      scene.add(brightStarsRef.current);

      // Nebula
      const nebulaGeometry = new THREE.BufferGeometry();
      const nebulaCount = 500;
      const nebulaPositions = new Float32Array(nebulaCount * 3);
      const nebulaColors = new Float32Array(nebulaCount * 3);
      for (let i = 0; i < nebulaCount * 3; i += 3) {
        nebulaPositions[i] = (Math.random() - 0.5) * 60;
        nebulaPositions[i + 1] = (Math.random() - 0.5) * 60;
        nebulaPositions[i + 2] = (Math.random() - 0.5) * 60 - 20;
        nebulaColors[i] = 0.5 + Math.random() * 0.5;
        nebulaColors[i + 1] = 0.2 + Math.random() * 0.3;
        nebulaColors[i + 2] = 0.8 + Math.random() * 0.2;
      }
      nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
      nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
      
      const nebulaCanvas = document.createElement('canvas');
      nebulaCanvas.width = 64; nebulaCanvas.height = 64;
      const nebulaCtx = nebulaCanvas.getContext('2d');
      const gradient = nebulaCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      nebulaCtx.fillStyle = gradient;
      nebulaCtx.fillRect(0, 0, 64, 64);
      const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);
      
      const nebulaMaterial = new THREE.PointsMaterial({
        size: 2, map: nebulaTexture, vertexColors: true, transparent: true,
        opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false
      });
      nebulaRef.current = new THREE.Points(nebulaGeometry, nebulaMaterial);
      scene.add(nebulaRef.current);
    };

    addBackground();

    // --- Cube Setup ---
    const cubeGeometry = new THREE.BoxGeometry(2.04, 2.04, 2.04);
    const materials = [];
    
    // Function to create texture for a single cube face
    const createFaceMaterial = (index, faceImageURL) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const faceColor = BORDER_COLORS[index];
      const faceLabel = FACE_LABELS[index];

      // Draw initial texture (placeholder/background)
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, faceColor);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Borders and Text
      const drawOverlay = () => {
        ctx.strokeStyle = faceColor;
        ctx.lineWidth = 16;
        ctx.strokeRect(10, 10, 492, 492);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeRect(26, 26, 460, 460);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Tommy DeVito', 256, 200);
        ctx.font = 'bold 36px Arial';
        ctx.fillText(faceLabel, 256, 260);
        ctx.font = '24px Arial';
        ctx.fillText(`Face ${index + 1}`, 256, 320);
      };

      if (faceImageURL) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, 512, 512);
          ctx.drawImage(img, 0, 0, 512, 512);
          drawOverlay();
          texture.needsUpdate = true;
        };
        img.onerror = () => {
          console.error(`Image ${index + 1} failed to load, using placeholder.`);
          drawOverlay();
        };
        img.src = faceImageURL;
      } else {
        // Video Face (Face 5) - Special texture
        const radialGradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
        radialGradient.addColorStop(0, BORDER_COLORS[5]);
        radialGradient.addColorStop(1, '#000033');
        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Play icon
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(200, 180);
        ctx.lineTo(200, 332);
        ctx.lineTo(340, 256);
        ctx.closePath();
        ctx.fill();

        // Text
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HIGHLIGHTS', 256, 400);
      }
      
      drawOverlay();
      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshPhongMaterial({ map: texture, transparent: false, opacity: 1 });
    };

    // Create materials for the 5 image faces
    for (let i = 0; i < 5; i++) {
      materials.push(createFaceMaterial(i, FACE_IMAGES[i]));
    }
    // Create material for the 6th video face
    materials.push(createFaceMaterial(5, null)); 

    const cube = new THREE.Mesh(cubeGeometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    // === NEON BORDER CREATION ===
    const neonBorderGroup = new THREE.Group();
    const neonMaterial = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 1
    });

    const edgeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 2, 8);
    const edges = [];

    // Vertical edges
    const verticalPositions = [
      [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1]
    ];
    
    verticalPositions.forEach(pos => {
      const edge = new THREE.Mesh(edgeGeometry, neonMaterial.clone());
      edge.position.set(pos[0], pos[1], pos[2]);
      edges.push(edge);
      neonBorderGroup.add(edge);
      
      // Glow effect
      const glowGeometry = edgeGeometry.clone();
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.scale.multiplyScalar(1.8);
      edge.add(glow);
    });

    // Horizontal edges
    const horizontalGeometry = new THREE.CylinderGeometry(0.03, 0.03, 2, 8);
    const horizontalPositions = [
      { pos: [0, 1, 1], rot: [0, 0, Math.PI / 2] },
      { pos: [0, 1, -1], rot: [0, 0, Math.PI / 2] },
      { pos: [1, 1, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [-1, 1, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [0, -1, 1], rot: [0, 0, Math.PI / 2] },
      { pos: [0, -1, -1], rot: [0, 0, Math.PI / 2] },
      { pos: [1, -1, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [-1, -1, 0], rot: [0, Math.PI / 2, 0] }
    ];

    horizontalPositions.forEach(item => {
      const edge = new THREE.Mesh(horizontalGeometry, neonMaterial.clone());
      edge.position.set(item.pos[0], item.pos[1], item.pos[2]);
      edge.rotation.set(item.rot[0], item.rot[1], item.rot[2]);
      edges.push(edge);
      neonBorderGroup.add(edge);
      
      // Glow effect
      const glowGeometry = horizontalGeometry.clone();
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.scale.multiplyScalar(1.8);
      edge.add(glow);
    });

    // Corner spheres
    const cornerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const corners = [
      [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
      [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
    ];

    corners.forEach(pos => {
      const corner = new THREE.Mesh(cornerGeometry, neonMaterial.clone());
      corner.position.set(pos[0], pos[1], pos[2]);
      neonBorderGroup.add(corner);
    });

    scene.add(neonBorderGroup);
    neonBorderRef.current = { group: neonBorderGroup, edges };

    // --- Characters Setup ---
    const characters = CHARACTER_COLORS.slice(0, 5).map(colors => {
      const character = createCharacter(colors);
      character.scale.set(0.01, 0.01, 0.01);
      character.position.y = -0.5; 
      scene.add(character);
      return character;
    });
    charactersRef.current = characters;

    // --- Event Handlers and Animation Loop ---
    const handleClick = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        const faceIndex = Math.floor(intersects[0].faceIndex / 2);
        if (faceIndex === 5) {
          setSelectedFace(null);
          setShowVideo(true);
        } else {
          setSelectedFace(faceIndex);
          setShowVideo(false);
        }
      }
    };

    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      const isMobile = width < 768;
      camera.position.z = isMobile ? 6 : 5;
    };
    
    // Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Background rotation (only when not zoomed)
      if (selectedFace === null && !showVideo) {
        if (starsRef.current) starsRef.current.rotation.y += 0.0002;
        if (brightStarsRef.current) brightStarsRef.current.rotation.y += 0.0003;
        if (nebulaRef.current) {
          nebulaRef.current.rotation.y += 0.0001;
          nebulaRef.current.rotation.x += 0.00005;
        }
      }

      // Cube or Character rotation
      if (selectedFace === null && !showVideo) {
        cube.rotation.x += 0.0012075;
        cube.rotation.y += 0.002415;
        neonBorderGroup.rotation.copy(cube.rotation);
      } else if (selectedFace !== null) {
        charactersRef.current[selectedFace].rotation.y += 0.01;
      }

      // Neon pulse effect (only when not zoomed)
      if (selectedFace === null && !showVideo) {
        const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
        edges.forEach(edge => {
          edge.material.opacity = pulse;
        });
      }

      renderer.render(scene, camera);
    };

    handleResize();
    animate();

    mountRef.current.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Effect for handling the transition animation
  useEffect(() => {
    if (!cubeRef.current || !charactersRef.current.length || !cameraRef.current || !neonBorderRef.current) return;

    const cube = cubeRef.current;
    const neonBorder = neonBorderRef.current.group;
    const characters = charactersRef.current;
    const camera = cameraRef.current;

    let startTime = Date.now();
    const duration = 1000;

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const startZ = selectedFace === null && !showVideo ? 4 : 5;
      const endZ = selectedFace === null && !showVideo ? 5 : 4;
      const startY = selectedFace === null && !showVideo ? -0.5 : 0;
      const endY = selectedFace === null && !showVideo ? 0 : -0.5;

      camera.position.z = startZ + (endZ - startZ) * eased;
      camera.position.y = startY + (endY - startY) * eased;

      if (selectedFace !== null || showVideo) {
        cube.scale.setScalar(0.01 + (1 - eased) * 0.99);
        neonBorder.scale.setScalar(0.01 + (1 - eased) * 0.99);
        cube.material.forEach(mat => mat.opacity = 0.9 * (1 - eased));
        
        if (selectedFace !== null) {
          characters[selectedFace].scale.setScalar(0.01 + eased * 0.99);
          characters.forEach((char, idx) => {
            if (idx !== selectedFace) char.scale.setScalar(0.01);
          });
        } else {
          characters.forEach(char => char.scale.setScalar(0.01));
        }
      } else {
        cube.scale.setScalar(0.01 + eased * 0.99);
        neonBorder.scale.setScalar(0.01 + eased * 0.99);
        cube.material.forEach(mat => mat.opacity = 0.9 * eased);
        characters.forEach(char => {
          char.scale.setScalar(Math.max(0.01, 1 - eased * 0.99));
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      }
    };

    animateTransition();
  }, [selectedFace, showVideo]);

  const getCurrentColor = () => {
    if (selectedFace !== null) {
      return BORDER_COLORS[selectedFace];
    }
    if (showVideo) {
      return BORDER_COLORS[5];
    }
    return 'rgba(204, 68, 42, 0.5)';
  };
  
  const currentBorderColor = getCurrentColor();

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden font-sans">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Video Modal Overlay */}
      {showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10 p-4">
          <div className="relative w-full max-w-4xl rounded-xl p-2"
              style={{ boxShadow: `0 0 40px 10px ${currentBorderColor}`, borderColor: currentBorderColor, borderStyle: 'solid', borderWidth: '4px' }}
          >
            <video
              ref={videoRef}
              className={`w-full rounded-lg`} 
              controls
              autoPlay
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            >
              Your browser does not support the video tag.
            </video>
            <button
              onClick={() => {
                setShowVideo(false);
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
      
      {/* Header Title and Instructions */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 text-white max-w-xs md:max-w-none backdrop-blur-sm bg-black/30 p-4 rounded-xl border border-white/20 shadow-lg">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-300 tracking-wider">
          DeVito NFT Viewer
        </h1>
        <p className="text-sm md:text-base text-gray-200">Click any cube face to zoom in on the exclusive memorabilia.</p>
        <p className="text-xs md:text-sm text-gray-400 mt-2">Face 6 (The blue face) is a special Highlight Video!</p>
      </div>

      {/* Return to Cube Button (Visible when zoomed in) */}
      {(selectedFace !== null || showVideo) && (
        <button
          onClick={() => { setSelectedFace(null); setShowVideo(false); }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-8 py-3 text-sm md:text-base bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl z-20"
        >
          <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16 3.422a12.083 12.083 0 01.665 1.11L12 20.913 5.174 18.02A12.084 12.084 0 014 16.273l6.16-3.422m-7.85-2.235A1.99 1.99 0 016.29 10L12 13.208 17.71 10a1.99 1.99 0 011.66-1.045l-7.234 3.422a12.083 12.083 0 01-.665 1.11L12 20.913 5.174 18.02A12.084 12.084 0 014 16.273l6.16-3.422z"></path></svg>
          Return to Spinning Cube
        </button>
      )}

      {/* Info Panel */}
      <div 
          className="absolute top-4 right-4 md:top-8 md:right-8 bg-black bg-opacity-60 p-4 md:p-6 rounded-xl text-white text-sm md:text-base border-2 transition-all duration-300 shadow-2xl w-48 md:w-64"
          style={{ borderColor: currentBorderColor, boxShadow: `0 0 15px ${currentBorderColor}` }}
      >
        <h3 className="font-extrabold mb-2 text-lg md:text-xl"
          style={{ color: currentBorderColor }}
        >
          {selectedFace !== null || showVideo ? FACE_LABELS[selectedFace !== null ? selectedFace : 5] : 'NFT Collection Status'}
        </h3>
        {showVideo ? (
          <>
            <p className="text-gray-300">Type: **Interactive Video**</p>
            <p className="text-gray-300">Face: **#6 (Back)**</p>
            <p className="text-gray-300">Event: **Gameday Highlights**</p>
          </>
        ) : selectedFace !== null ? (
          <>
            <p className="text-gray-300">Type: **3D Character NFT**</p>
            <p className="text-gray-300">Edition: **#{selectedFace + 1}/6**</p>
            <p className="text-gray-300">Rarity: **Legendary**</p>
            <p className="text-gray-300 mt-2">Viewed Character: **{BORDER_COLORS[selectedFace].toUpperCase()}**</p>
          </>
        ) : (
          <>
            <p className="text-gray-300">Total Pieces: **6/6**</p>
            <p className="text-gray-300">Click to Inspect</p>
            <p className="text-gray-500 mt-4 text-xs">A Three.js + React showcase with neon borders.</p>
          </>
        )}
      </div>
    </div>
  );
}

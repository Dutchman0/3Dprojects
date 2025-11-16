import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function NFTCubeInterface() {
  const mountRef = useRef(null);
  const [selectedFace, setSelectedFace] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);
  const sceneRef = useRef(null);
  const cubeRef = useRef(null);
  const charactersRef = useRef([]);
  const cameraRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const starsRef = useRef(null);
  const brightStarsRef = useRef(null);
  const nebulaRef = useRef(null);

  // Tommy DeVito memorabilia images for each face
  const faceImages = [
    'https://www.authenticheroes.com/wp-content/uploads/2025/11/image000001-225x300.jpg',
    'https://www.authenticheroes.com/wp-content/uploads/2025/11/image000000.jpg',
    'https://www.authenticheroes.com/wp-content/uploads/2025/11/image000004.jpg',
    'https://www.authenticheroes.com/wp-content/uploads/2025/11/image000003.jpg',
    'https://www.authenticheroes.com/wp-content/uploads/2025/11/image000002.jpg',
  ];

  const characterColors = [
    { skin: 0xf4c8a8, hair: 0x4a2511, dress: 0xff00ff },
    { skin: 0xf4c8a8, hair: 0xffd700, dress: 0x00ffff },
    { skin: 0xf4c8a8, hair: 0xff6347, dress: 0xffff00 },
    { skin: 0xf4c8a8, hair: 0x000000, dress: 0xff0000 },
    { skin: 0xf4c8a8, hair: 0x8b4513, dress: 0x00ff00 },
  ];

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    
    // Create space background with stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 100;
      starPositions[i + 1] = (Math.random() - 0.5) * 100;
      starPositions[i + 2] = (Math.random() - 0.5) * 100;
      
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        starColors[i] = 1;
        starColors[i + 1] = 1;
        starColors[i + 2] = 1;
      } else if (colorChoice < 0.85) {
        starColors[i] = 0.8;
        starColors[i + 1] = 0.9;
        starColors[i + 2] = 1;
      } else {
        starColors[i] = 1;
        starColors[i + 1] = 0.95;
        starColors[i + 2] = 0.8;
      }
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;
    
    const brightStarGeometry = new THREE.BufferGeometry();
    const brightStarCount = 200;
    const brightStarPositions = new Float32Array(brightStarCount * 3);
    
    for (let i = 0; i < brightStarCount * 3; i += 3) {
      brightStarPositions[i] = (Math.random() - 0.5) * 100;
      brightStarPositions[i + 1] = (Math.random() - 0.5) * 100;
      brightStarPositions[i + 2] = (Math.random() - 0.5) * 100;
    }
    
    brightStarGeometry.setAttribute('position', new THREE.BufferAttribute(brightStarPositions, 3));
    
    const brightStarMaterial = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xffffff,
      transparent: true,
      opacity: 1
    });
    
    const brightStars = new THREE.Points(brightStarGeometry, brightStarMaterial);
    scene.add(brightStars);
    brightStarsRef.current = brightStars;
    
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
    nebulaCanvas.width = 64;
    nebulaCanvas.height = 64;
    const nebulaCtx = nebulaCanvas.getContext('2d');
    const gradient = nebulaCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    nebulaCtx.fillStyle = gradient;
    nebulaCtx.fillRect(0, 0, 64, 64);
    const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);
    
    const nebulaMaterial = new THREE.PointsMaterial({
      size: 2,
      map: nebulaTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);
    nebulaRef.current = nebula;
    
    sceneRef.current = scene;

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

    // Force initial render
    setTimeout(() => {
      handleResize();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }, 100);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.6);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
    pointLight2.position.set(5, -5, -5);
    scene.add(pointLight2);

    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const textureLoader = new THREE.TextureLoader();
    
    const materials = [];
    const faceLabels = ['Welcome Letter', 'AH Logo', 'Certificate', 'Nameplate', 'Jersey #15'];
    
    for (let i = 0; i < 5; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#00FF00'];
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, colors[i]);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 472, 472);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tommy DeVito', 256, 200);
      ctx.font = 'bold 36px Arial';
      ctx.fillText(faceLabels[i], 256, 260);
      ctx.font = '24px Arial';
      ctx.fillText(`Face ${i + 1}`, 256, 320);
      
      if (faceImages[i]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, 512, 512);
          ctx.drawImage(img, 0, 0, 512, 512);
          const texture = new THREE.CanvasTexture(canvas);
          cube.material[i].map = texture;
          cube.material[i].needsUpdate = true;
        };
        img.onerror = () => {
          console.log(`Image ${i + 1} failed to load, using placeholder`);
        };
        img.src = faceImages[i];
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      materials.push(new THREE.MeshPhongMaterial({ 
        map: texture,
        transparent: false,
        opacity: 1
      }));
    }
    
    const canvas6 = document.createElement('canvas');
    canvas6.width = 512;
    canvas6.height = 512;
    const ctx6 = canvas6.getContext('2d');
    
    const gradient6 = ctx6.createRadialGradient(256, 256, 0, 256, 256, 300);
    gradient6.addColorStop(0, '#0066FF');
    gradient6.addColorStop(1, '#000033');
    ctx6.fillStyle = gradient6;
    ctx6.fillRect(0, 0, 512, 512);
    
    ctx6.fillStyle = '#FFFFFF';
    ctx6.beginPath();
    ctx6.moveTo(200, 180);
    ctx6.lineTo(200, 332);
    ctx6.lineTo(340, 256);
    ctx6.closePath();
    ctx6.fill();
    
    ctx6.font = 'bold 48px Arial';
    ctx6.textAlign = 'center';
    ctx6.fillText('HIGHLIGHTS', 256, 400);
    
    const texture6 = new THREE.CanvasTexture(canvas6);
    materials.push(new THREE.MeshPhongMaterial({ 
      map: texture6,
      transparent: false,
      opacity: 1
    }));

    const cube = new THREE.Mesh(cubeGeometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(cubeGeometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    cube.add(wireframe);

    const characters = [];
    characterColors.forEach((colors) => {
      const character = createCharacter(colors);
      character.scale.set(0.01, 0.01, 0.01);
      character.position.y = -0.5;
      scene.add(character);
      characters.push(character);
    });
    charactersRef.current = characters;

    const handleClick = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        const faceIndex = Math.floor(intersects[0].faceIndex / 2);
        if (faceIndex === 5) {
          setShowVideo(true);
          setSelectedFace(null);
        } else {
          setSelectedFace(faceIndex);
          setShowVideo(false);
        }
      }
    };

    mountRef.current.addEventListener('click', handleClick);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (starsRef.current) starsRef.current.rotation.y += 0.0002;
      if (brightStarsRef.current) brightStarsRef.current.rotation.y += 0.0003;
      if (nebulaRef.current) {
        nebulaRef.current.rotation.y += 0.0001;
        nebulaRef.current.rotation.x += 0.00005;
      }

      if (selectedFace === null && !showVideo) {
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.01;
      } else if (selectedFace !== null) {
        charactersRef.current[selectedFace].rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      const isMobile = width < 768;
      const cubeScale = isMobile ? 0.7 : 1;
      if (selectedFace === null && !showVideo) {
        cube.scale.setScalar(cubeScale);
      }
      
      if (isMobile) {
        camera.position.z = 6;
      } else {
        camera.position.z = 5;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const createCharacter = (colors) => {
    const character = new THREE.Group();
    
    const skinMaterial = new THREE.MeshPhongMaterial({ color: colors.skin });
    const hairMaterial = new THREE.MeshPhongMaterial({ color: colors.hair });
    const dressMaterial = new THREE.MeshPhongMaterial({ color: colors.dress });

    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.y = 1.5;
    character.add(head);

    const hairGeometry = new THREE.SphereGeometry(0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.65;
    character.add(hair);

    const torsoGeometry = new THREE.CylinderGeometry(0.35, 0.3, 0.8, 32);
    const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
    torso.position.y = 0.7;
    character.add(torso);

    const dressGeometry = new THREE.CylinderGeometry(0.3, 0.6, 1.2, 32);
    const dress = new THREE.Mesh(dressGeometry, dressMaterial);
    dress.position.y = -0.3;
    character.add(dress);

    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    leftArm.position.set(-0.4, 0.7, 0);
    leftArm.rotation.z = 0.3;
    character.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    rightArm.position.set(0.4, 0.7, 0);
    rightArm.rotation.z = -0.3;
    character.add(rightArm);

    const handGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
    leftHand.position.set(-0.5, 0.3, 0);
    character.add(leftHand);

    const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
    rightHand.position.set(0.5, 0.3, 0);
    character.add(rightHand);

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

  useEffect(() => {
    if (!cubeRef.current || !charactersRef.current.length || !cameraRef.current) return;

    const cube = cubeRef.current;
    const characters = charactersRef.current;
    const camera = cameraRef.current;

    let startTime = Date.now();
    const duration = 1000;

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (selectedFace !== null || showVideo) {
        cube.scale.setScalar(0.01 + (1 - eased) * 0.99);
        cube.material.forEach(mat => mat.opacity = 0.9 * (1 - eased));
        
        if (selectedFace !== null) {
          characters[selectedFace].scale.setScalar(0.01 + eased * 0.99);
          characters.forEach((char, idx) => {
            if (idx !== selectedFace) {
              char.scale.setScalar(0.01);
            }
          });
        } else {
          characters.forEach(char => char.scale.setScalar(0.01));
        }
        
        camera.position.z = 5 - eased * 1;
      } else {
        cube.scale.setScalar(0.01 + eased * 0.99);
        cube.material.forEach(mat => mat.opacity = 0.9 * eased);
        characters.forEach(char => {
          char.scale.setScalar(Math.max(0.01, 1 - eased * 0.99));
        });
        camera.position.z = 4 + eased * 1;
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      }
    };

    animateTransition();
  }, [selectedFace, showVideo]);

  const faceNames = [
    'Welcome Letter', 
    'Authentic Heroes Logo', 
    'Certificate of Authenticity', 
    'DeVito Nameplate', 
    'Game Jersey #15', 
    'Highlight Video'
  ];

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10 p-4">
          <div className="relative w-full max-w-4xl">
            <video
              ref={videoRef}
              className="w-full rounded-lg shadow-2xl"
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
              className="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-10 h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg flex items-center justify-center text-xl md:text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 md:top-8 md:left-8 text-white max-w-xs md:max-w-none">
        <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-cyan-500">
          Tommy Divito Fan View
        </h1>
        <p className="text-sm md:text-base text-gray-300">Click any cube face to reveal character</p>
        <p className="text-xs md:text-sm text-gray-400 mt-1">Face 6 plays a video!</p>
      </div>

      {selectedFace !== null && (
        <button
          onClick={() => setSelectedFace(null)}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 md:px-8 md:py-3 text-sm md:text-base bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-full hover:scale-110 transition-transform shadow-lg"
        >
          Return to Cube
        </button>
      )}

      <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-black bg-opacity-50 p-3 md:p-4 rounded-lg text-white text-sm md:text-base">
        <h3 className="font-bold mb-1 md:mb-2">NFT Details</h3>
        {showVideo ? (
          <>
            <p className="text-xs md:text-sm">Type: Video NFT</p>
            <p className="text-xs md:text-sm">Face 6 (Back)</p>
            <p className="text-xs md:text-sm">Format: MP4</p>
          </>
        ) : selectedFace !== null ? (
          <>
            <p className="text-xs md:text-sm">Name: {faceNames[selectedFace]}</p>
            <p className="text-xs md:text-sm">Edition: {selectedFace + 1}/6</p>
            <p className="text-xs md:text-sm">Rarity: Legendary</p>
            <p className="text-xs md:text-sm">Type: 3D Avatar</p>
          </>
        ) : (
          <>
            <p className="text-xs md:text-sm">Collection: 6/6 NFTs</p>
            <p className="text-xs md:text-sm">Click a face to view</p>
          </>
        )}
      </div>

      <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 text-white text-xs md:text-sm">
        <p className="font-bold mb-1 md:mb-2">Instructions:</p>
        <p>• Click any cube face</p>
        <p className="hidden md:block">• Faces 1-5: 3D characters</p>
        <p className="hidden md:block">• Face 6: Video content</p>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 text-white text-xs md:text-sm text-right">
        <p>Three.js + React</p>
        <p className="text-gray-400">Interactive 3D NFT</p>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// All border colors are set to the requested hex code #CC442A
const BORDER_COLORS = ['#CC442A', '#CC442A', '#CC442A', '#CC442A', '#CC442A', '#CC442A'];

const FACE_LABELS = ['Welcome Letter', 'AH Logo', 'Certificate', 'Nameplate', 'Jersey #15', 'Highlight Video'];

// Target rotations (Euler XYZ) to center each cube face upright towards the camera
const TARGET_ROTATIONS = [
  new THREE.Euler(0, 0, 0),             // 0: Z+ (Front)
  new THREE.Euler(0, -Math.PI / 2, 0),  // 1: X+ (Right)
  new THREE.Euler(0, Math.PI, 0),       // 2: Z- (Back)
  new THREE.Euler(0, Math.PI / 2, 0),   // 3: X- (Left)
  new THREE.Euler(Math.PI / 2, 0, 0),   // 4: Y+ (Top)
  new THREE.Euler(-Math.PI / 2, 0, 0)   // 5: Y- (Bottom)
];

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
  // currentFaceIndex controls which face is centered/targeted for rotation (0-5)
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0); 
  // selectedFace controls which character is zoomed in (0-4 or null)
  const [selectedFace, setSelectedFace] = useState(null); 
  const [showVideo, setShowVideo] = useState(false);
  
  // Three.js object refs
  const videoRef = useRef(null);
  const cubeRef = useRef(null);
  const charactersRef = useRef([]);
  const cameraRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  // Removed refs for stars and nebula as they are no longer used
  // const starsRef = useRef(null);
  // const brightStarsRef = useRef(null);
  // const nebulaRef = useRef(null);

  // Handler for navigation arrows
  const handleFaceChange = useCallback((direction) => {
    // If a character or video is currently zoomed in, zoom out first
    if (selectedFace !== null || showVideo) {
      setSelectedFace(null);
      setShowVideo(false);
    }
    
    setCurrentFaceIndex(prevIndex => (prevIndex + direction + 6) % 6);
  }, [selectedFace, showVideo]);

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
    
    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point Light 1
    const pointLight1 = new THREE.PointLight(0xffffff, 0.6);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);
    
    // Point Light 2
    const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
    pointLight2.position.set(5, -5, -5);
    scene.add(pointLight2);
    
    // --- Background (Stars & Nebula) ---
    // Removed the addBackground function and its call
    // const addBackground = () => { /* ... */ };
    // addBackground();


    // --- Cube Setup ---
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
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
      
      drawOverlay(); // Draw initial overlay while image loads
      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshPhongMaterial({ map: texture, transparent: false, opacity: 1 });
    };

    // Create materials for the 5 image faces
    for (let i = 0; i < 5; i++) {
      materials.push(createFaceMaterial(i, FACE_IMAGES[i]));
    }
    // Create material for the 6th video face (No image URL passed)
    materials.push(createFaceMaterial(5, null)); 

    const cube = new THREE.Mesh(cubeGeometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    // Set initial rotation to Face 0 target
    cube.rotation.copy(TARGET_ROTATIONS[0]);

    // Add wireframe border
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(cubeGeometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    cube.add(wireframe);

    // --- Characters Setup ---
    const characters = CHARACTER_COLORS.slice(0, 5).map(colors => {
      const character = createCharacter(colors);
      // The character is placed below the center of the cube
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
        
        // Update the current face index based on the clicked face
        setCurrentFaceIndex(faceIndex);

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
      
      // Responsive camera adjustments
      const isMobile = width < 768;
      camera.position.z = isMobile ? 6 : 5;
    };
    
    // Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.0005; // Time variable for sinusoidal animation
      
      // Global oscillation factor (used when not zoomed in)
      const isZoomed = selectedFace !== null || showVideo;
      const rotationSpeed = 0.05; // Smoothness of rotation

      // Removed background rotation for stars and nebula
      // if (starsRef.current) starsRef.current.rotation.y += 0.0002;
      // if (brightStarsRef.current) brightStarsRef.current.rotation.y += 0.0003;
      // if (nebulaRef.current) {
      //   nebulaRef.current.rotation.y += 0.0001;
      //   nebulaRef.current.rotation.x += 0.00005;
      // }

      // --- Cube Rotation and Oscillation ---
      const targetRotation = TARGET_ROTATIONS[currentFaceIndex];

      // Interpolate to target rotation (SLERP for quaternion for smoother path)
      const currentQuaternion = new THREE.Quaternion().copy(cube.quaternion);
      const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
      
      // Apply SLERP only if the cube is not already there (within epsilon)
      if (!currentQuaternion.equals(targetQuaternion)) {
          currentQuaternion.slerp(targetQuaternion, rotationSpeed);
          cube.rotation.setFromQuaternion(currentQuaternion);
      }
      
      // Apply subtle hover only when fully un-zoomed
      if (!isZoomed && currentFaceIndex === 0) {
        // Subtle oscillation animation for the default front view (Face 0)
        cube.position.y = Math.sin(time * 0.5) * 0.1; // Gentle hover on Y-axis
        cube.rotation.y += Math.sin(time * 0.3) * 0.001; // Tiny oscillating yaw
        cube.rotation.x += Math.cos(time * 0.2) * 0.0005; // Tiny oscillating pitch
      } else {
        cube.position.y = 0; // Keep centered when a face is selected
      }


      // Character rotation when zoomed in
      if (selectedFace !== null) {
        charactersRef.current[selectedFace].rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };

    // Initial setup calls
    handleResize();
    animate();

    // Event listeners
    mountRef.current.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
      // Clean up renderer and its canvas element
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [currentFaceIndex]); // currentFaceIndex dependency ensures transition logic is handled when state changes

  // Effect for handling the transition animation (Runs on selectedFace/showVideo state change)
  useEffect(() => {
    if (!cubeRef.current || !charactersRef.current.length || !cameraRef.current) return;

    const cube = cubeRef.current;
    const characters = charactersRef.current;
    const camera = cameraRef.current;

    let startTime = Date.now();
    const duration = 1000; // 1 second transition
    const isZoomed = selectedFace !== null || showVideo;

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out effect

      // Camera Z positions
      const startZ = isZoomed ? 5 : 4;
      const endZ = isZoomed ? 4 : 5;
      
      // Camera Y positions (to center on the character at y=-0.5)
      const startY = isZoomed ? 0 : -0.5;
      const endY = isZoomed ? -0.5 : 0;

      // Update camera position to ensure character is centered 
      camera.position.z = startZ + (endZ - startZ) * eased;
      camera.position.y = startY + (endY - startY) * eased;

      if (isZoomed) {
        // Transition TO character/video view (Cube shrinks, object grows)
        cube.scale.setScalar(1 - eased * 0.99); // Shrink cube to 1%
        cube.material.forEach(mat => mat.opacity = 1 - eased);
        
        if (selectedFace !== null) {
          // Grow selected character
          characters[selectedFace].scale.setScalar(0.01 + eased * 0.99);
          // Shrink unselected characters
          characters.forEach((char, idx) => {
            if (idx !== selectedFace) {
              char.scale.setScalar(0.01);
            }
          });
        } else {
          // Video selected, shrink all characters
          characters.forEach(char => char.scale.setScalar(0.01));
        }
      } else {
        // Transition back TO cube view (Cube grows, object shrinks)
        cube.scale.setScalar(0.01 + eased * 0.99); // Grow cube back to 100%
        cube.material.forEach(mat => mat.opacity = eased);
        
        // Shrink characters if returning from a character view
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

  // Helper function to determine the current border color for the UI panel
  const getCurrentColor = () => {
    // Priority: The face currently centered by rotation, unless zoomed in
    const faceIndex = selectedFace !== null ? selectedFace : (showVideo ? 5 : currentFaceIndex);
    return BORDER_COLORS[faceIndex];
  };
  
  const currentBorderColor = getCurrentColor();
  const isZoomed = selectedFace !== null || showVideo;
  const activeFaceLabel = FACE_LABELS[isZoomed ? (selectedFace !== null ? selectedFace : 5) : currentFaceIndex];


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
              // Placeholder video URL
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

      {/* --- Side Change Selection Arrows --- */}
      {!isZoomed && (
        <>
          {/* Left Arrow */}
          <button 
            onClick={() => handleFaceChange(-1)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-20 shadow-lg backdrop-blur-sm"
            aria-label="Previous Face"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          {/* Right Arrow */}
          <button 
            onClick={() => handleFaceChange(1)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-20 shadow-lg backdrop-blur-sm"
            aria-label="Next Face"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </>
      )}
      
      {/* Header Title and Instructions */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 text-white max-w-xs md:max-w-none backdrop-blur-sm bg-black/30 p-4 rounded-xl border border-white/20 shadow-lg">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-300 tracking-wider">
          DeVito NFT Viewer
        </h1>
        <p className="text-sm md:text-base text-gray-200">Use the side arrows or click the cube to explore the assets.</p>
        <p className="text-xs md:text-sm text-gray-400 mt-2">Currently Viewing: <span className="font-bold" style={{ color: currentBorderColor }}>{activeFaceLabel}</span></p>
      </div>

      {/* Return to Cube Button (Visible when zoomed in) */}
      {isZoomed && (
        <button
          onClick={() => { setSelectedFace(null); setShowVideo(false); }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-8 py-3 text-sm md:text-base bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl z-20"
        >
          <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16 3.422a12.083 12.083 0 01.665 1.11L12 20.913 5.174 18.02A12.084 12.084 0 014 16.273l6.16-3.422m-7.85-2.235A1.99 1.99 0 016.29 10L12 13.208 17.71 10a1.99 1.99 0 011.66-1.045l-7.234 3.422a12.083 12.083 0 01-.665 1.11L12 20.913 5.174 18.02A12.084 12.084 0 014 16.273l6.16-3.422z"></path></svg>
          Return to Cube View
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
          {activeFaceLabel}
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
            <p className="text-gray-300">Face: **#{currentFaceIndex + 1}/6**</p>
            <p className="text-gray-300">Total Pieces: **6/6**</p>
            <p className="text-gray-300 mt-4 text-xs">A Three.js + React showcase of immersive digital assets.</p>
          </>
        )}
      </div>
    </div>
  );
}

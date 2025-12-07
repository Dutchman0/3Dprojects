if (selectedFace === null && !showVideo && !showImage) {
  // ---------- pause handling ----------
  if (pauseTimerRef.current > 0) {
    pauseTimerRef.current -= dt;
    return;
  }

  const stepAngle = Math.PI / 2;

  if (flipPhaseRef.current === 0) {
    // ----- Phase 0: step through side faces -----
    const target = flipStepRef.current * stepAngle;
    const diff = target - cubeLocal.rotation.y;

    if (Math.abs(diff) > 0.01) {
      cubeLocal.rotation.y += Math.sign(diff) * FLIP_SPEED;
    } else {
      cubeLocal.rotation.y = target;
      flipStepRef.current++;

      if (flipStepRef.current > 3) {
        flipStepRef.current = 0;
        flipPhaseRef.current = 1; // move to video phase
      }

      pauseTimerRef.current = PAUSE_TIME;
    }
  }

  if (flipPhaseRef.current === 1) {
    // ----- Phase 1: flip to top/bottom -----
    const target = Math.PI;
    const diff = target - cubeLocal.rotation.x;

    if (Math.abs(diff) > 0.01) {
      cubeLocal.rotation.x += Math.sign(diff) * FLIP_SPEED;
    } else {
      cubeLocal.rotation.x = target;
      flipPhaseRef.current = 2;
      pauseTimerRef.current = PAUSE_TIME;
    }
  }

  if (flipPhaseRef.current === 2) {
    // ----- Phase 2: reverse side faces -----
    const target = flipStepRef.current * stepAngle;
    const diff = target - cubeLocal.rotation.y;

    if (Math.abs(diff) > 0.01) {
      cubeLocal.rotation.y += Math.sign(diff) * FLIP_SPEED;
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

  // ---------- keep neon synced ----------
  if (neonGroupRef.current) {
    neonGroupRef.current.rotation.copy(cubeLocal.rotation);
  }

  // ---------- camera sync ----------
  if (cameraRef.current) {
    cameraRef.current.position.x = Math.sin(cubeLocal.rotation.y) * 1.2;
    cameraRef.current.position.z = 5 + Math.cos(cubeLocal.rotation.y) * 0.3;
    cameraRef.current.lookAt(0, 0, 0);
  }
}

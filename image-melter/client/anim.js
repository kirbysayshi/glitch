export function initAnimState(inputCvs, requestedSliceCount, maxStartOffset, acceleration, initialVelocity) {
  // compute slices
  const sliceWidth = Math.floor(inputCvs.width / requestedSliceCount) || 1;
  const sliceCount = Math.ceil(inputCvs.width / sliceWidth);
  
  // create initial ys
  const initialYs = [-doomRand() % maxStartOffset];
  for (let i = 1; i < sliceCount; i++) {
    const prev = initialYs[i - 1];
    const maxInc = Math.floor(maxStartOffset / 10.333);
    const amount = maxInc * ((doomRand() % 3) - 1);
    const proposed = prev + amount;
    let r = proposed;
    if (proposed > 0) r = 0;
    else if (proposed < -maxStartOffset) r = -maxStartOffset + 1;
    initialYs.push(r);
  }
  
  const scratch = makeCanvas();
  scratch.cvs.width = inputCvs.width;
  scratch.cvs.height = inputCvs.height;
  
  return {
    inputCvs,
    initialYs,
    sliceWidth,
    sliceCount,
    acceleration,
    initialVelocity,
    scratch,
  }
}

export function animStateFrame(animState, frameNum) {
  const {
    inputCvs,
    scratch,
    sliceCount,
    sliceWidth,
    initialYs,
    acceleration,
    initialVelocity,
  } = animState;

  scratch.ctx.fillStyle = '#fff';
  // TODO: should there be a background color?
  // Or just the original image for loop effect?
  // scratch.ctx.drawImage(inputCvs, 0, 0);
  scratch.ctx.clearRect(0, 0, scratch.cvs.width, scratch.cvs.height);
  
  let slicesRenderedThisFrame = 0;
  
  // TODO: add an acceleration to the Ys.
  for (let i = 0; i < sliceCount; i++) {
    const initialY = initialYs[i];
    let pos = initialY;
    let vel = initialVelocity;
    let j = frameNum;
    while(j--) {
      pos = pos + vel;
      vel = vel + acceleration;
    }
    const y = pos;
    if (y > inputCvs.height) continue; // this slice is done
    
    const sx = i * sliceWidth;
    const sy = 0;
    const swidth = sliceWidth;
    const sheight = inputCvs.height;
    
    const dx = i * sliceWidth;
    const dy = y < 0 ? 0 : y;
    const dwidth = sliceWidth;
    const dheight = inputCvs.height;
    
    scratch.ctx.drawImage(inputCvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
    
    slicesRenderedThisFrame++;
  }
  
  if (slicesRenderedThisFrame === 0) {
    // we done!
    return null;
  } else {
    return scratch.ctx.getImageData(0, 0, scratch.cvs.width, scratch.cvs.height);
  }
}
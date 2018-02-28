import { doomRand } from './doom';
import { makeCanvas, } from './utils';

export function initAnimState([backCvs, foreCvs], requestedSliceCount, maxStartOffset, acceleration, initialVelocity) {
  // compute slices
  const sliceWidth = Math.floor(foreCvs.width / requestedSliceCount) || 1;
  const sliceCount = Math.ceil(foreCvs.width / sliceWidth);
  
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
  scratch.cvs.width = foreCvs.width;
  scratch.cvs.height = foreCvs.height;
  
  return {
    backCvs,
    foreCvs,
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
    foreCvs,
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
  // scratch.ctx.drawImage(foreCvs, 0, 0);
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
    if (y > foreCvs.height) continue; // this slice is done
    
    const sx = i * sliceWidth;
    const sy = 0;
    const swidth = sliceWidth;
    const sheight = foreCvs.height;
    
    const dx = i * sliceWidth;
    const dy = y < 0 ? 0 : y;
    const dwidth = sliceWidth;
    const dheight = foreCvs.height;
    
    scratch.ctx.drawImage(foreCvs,
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
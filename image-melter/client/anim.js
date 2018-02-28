import { doomRand } from './doom';
import { makeCanvas, } from './utils';

function makeInitialYs(maxStartOffset, sliceCount) {
  const ys = [-doomRand() % maxStartOffset];
  for (let i = 1; i < sliceCount; i++) {
    const prev = ys[i - 1];
    const maxInc = Math.floor(maxStartOffset / 10.333);
    const amount = maxInc * ((doomRand() % 3) - 1);
    const proposed = prev + amount;
    let r = proposed;
    if (proposed > 0) r = 0;
    else if (proposed < -maxStartOffset) r = -maxStartOffset + 1;
    ys.push(r);
  }
  return ys;
}

export function initAnimState(cvses, requestedSliceCount, maxStartOffset, acceleration, initialVelocity) {
  const [bgCvs, fgCvs] = cvses;

  // compute slices
  const sliceWidth = Math.floor(fgCvs.width / requestedSliceCount) || 1;
  const sliceCount = Math.ceil(fgCvs.width / sliceWidth);
  
  // create initial ys
  const fgYs = makeInitialYs(maxStartOffset, sliceCount);
  const bgYs = makeInitialYs(maxStartOffset, sliceCount);
  
  const scratch = makeCanvas();
  scratch.cvs.width = fgCvs.width;
  scratch.cvs.height = fgCvs.height;
  
  return {
    cvses,
    ys: [bgYs, fgYs],
    sliceWidth,
    sliceCount,
    acceleration,
    initialVelocity,
    scratch,
  }
}

export function animStateFrame(animState, frameNum) {
  const {
    cvses: [bgCvs, fgCvs],
    scratch,
    sliceCount,
    sliceWidth,
    ys: [bgYs, initialYs],
    acceleration,
    initialVelocity,
  } = animState;

  scratch.ctx.clearRect(0, 0, scratch.cvs.width, scratch.cvs.height);
  
  let slicesRenderedThisFrame = 0;
  let cvsIdx = 0;
  
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
    if (y > fgCvs.height) continue; // this slice is done
    
    const sx = i * sliceWidth;
    const sy = 0;
    const swidth = sliceWidth;
    const sheight = fgCvs.height;
    
    const dx = i * sliceWidth;
    const dy = y < 0 ? 0 : y;
    const dwidth = sliceWidth;
    const dheight = fgCvs.height;
    
    scratch.ctx.drawImage(fgCvs,
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
import { doomRand } from './doom';
import { makeCanvas, } from './utils';

function clampRand(min, max) {
  return min + (Math.random() * (max - min));
}

function makeInitialYs(maxStartOffset, sliceCount) {
  const ys = [-doomRand() % maxStartOffset];
  const maxInc = Math.floor(maxStartOffset / 10.333) || 1;
  
  for (let i = 1; i < sliceCount; i++) {
    const prev = ys[i - 1];
    const dir = (doomRand() % 3) - 1;
    // DOOM used 1 * dir, basically. But with today's large images,
    // the value needs to be scaled to make the effect aesthetically
    // similar to the original.
    const amount = (Math.random() * maxInc) * dir;
    const proposed = prev + amount;
    let r = proposed;
    if (proposed > 0) {
      r = 0;
    } else if (proposed < -maxStartOffset) {
      // DOOM used this value presumably to help decrease the probability
      // of a flatline if the max is reached.
      // Since images are larger now, we need it to be scaled to have a
      // reasonable chance of avoiding a flatline.
      // r = -maxStartOffset + 1;
      r = -maxStartOffset + (Math.floor(maxStartOffset / 100) || 1);
    }
    ys.push(r);
  }
  return ys;
}

export const normalizeCvses = (cvses) => {
  // find the canvas with the ratio closest to 1
  const mostSquare = cvses.reduce((prev, cvs, idx) => {
    const top = Math.min(cvs.width, cvs.height);
    const bottom = Math.max(cvs.width, cvs.height);
    const ratio = top / bottom;
    if (ratio > prev.ratio) {
      return { ratio, cvs }  
    } else {
      return prev
    }
  }, { ratio: 0, cvs: null });
  
  return cvses.map(cvs => {
    if (cvs === mostSquare.cvs) return cvs;
  
    const heightRatio = cvs.height / mostSquare.cvs.height;
    const widthRatio = cvs.width / mostSquare.cvs.width;
    
    const smallest = Math.min(heightRatio, widthRatio);
    
    // TODO: how to handle if the square is drastically smaller
    // than the other? Shouldn't the square get blown up to show
    // more detail of the other?
    const scaled = makeCanvas();
    scaled.cvs.width = mostSquare.cvs.width;
    scaled.cvs.height = mostSquare.cvs.height;
    
    const ctx = cvs.getContext('2d');
    const cvsHWidth = cvs.width / 2;
    const cvsHHeight = cvs.height / 2;
    // Transform the half coords of mostSquare into the coordinate space
    // of cvs.
    const mostHWidthScaled = (mostSquare.cvs.width / 2) * smallest;
    const mostHHeightScaled = (mostSquare.cvs.height / 2) * smallest;
    
    // Use as much of the image as possible.
    const sx = smallest === widthRatio
      ? 0
      : cvsHWidth - mostHWidthScaled;
    const sy = smallest === heightRatio
      ? 0
      : cvsHHeight - mostHHeightScaled;
    const swidth = mostSquare.cvs.width * smallest;
    const sheight = mostSquare.cvs.height * smallest;
    
    const dx = 0;
    const dy = 0;
    const dwidth = scaled.cvs.width;
    const dheight = scaled.cvs.height;
    scaled.ctx.drawImage(cvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
    return scaled.cvs;
  });
}

export function initAnimState(cvses, requestedSliceCount, maxStartOffset, acceleration, initialVelocity) {
  const [bgCvs, fgCvs] = cvses;

  // compute slices
  const sliceWidth = Math.floor(fgCvs.width / requestedSliceCount) || 1;
  const sliceCount = Math.ceil(fgCvs.width / sliceWidth);
  
  // create initial ys
  const fgYs = makeInitialYs(maxStartOffset, sliceCount);
  const bgYs = makeInitialYs(maxStartOffset, sliceCount);
  // const fgYs = makeInitialYsNoise(maxStartOffset, sliceCount);
  // const bgYs = makeInitialYsNoise(maxStartOffset, sliceCount);
  
  const scratch = makeCanvas();
  scratch.cvs.width = fgCvs.width;
  scratch.cvs.height = fgCvs.height;
  
  return {
    // TODO: put this normalizing into the reducer instead to give intelligent
    // guesses about slice values.
    cvses,//: normalizeCvses(cvses),
    ys: [bgYs, fgYs],
    sliceWidth,
    sliceCount,
    acceleration,
    initialVelocity,
    scratch,
    bgIdx: 0,
    frameNum: 0,
    wipeCount: 0,
  }
}

export function animStateFrame(animState) {
  const {
    cvses,
    scratch,
    sliceCount,
    sliceWidth,
    acceleration,
    initialVelocity,
    bgIdx,
    frameNum,
  } = animState;
  
  let slicesRenderedThisFrame = 0;
  let bgCvs = cvses[bgIdx];
  let fgCvs = cvses[(bgIdx + 1) % cvses.length];
  let ys = animState.ys[bgIdx];
  
  scratch.ctx.drawImage(bgCvs, 0, 0, bgCvs.width, bgCvs.height,
    0, 0, scratch.cvs.width, scratch.cvs.height);
                        
  for (let i = 0; i < sliceCount; i++) {
    const initialY = ys[i];
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
  
  animState.frameNum += 1;
  
  if (slicesRenderedThisFrame === 0) {
    animState.bgIdx = (animState.bgIdx + 1) % animState.cvses.length;
    animState.frameNum = 0;
    animState.wipeCount++;
  }
  
  if (animState.wipeCount === animState.cvses.length) {
    // we done!
    return null;  
  }
  
  return scratch.ctx.getImageData(0, 0, scratch.cvs.width, scratch.cvs.height);
}
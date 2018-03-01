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

const normalizeCvses = (cvses) => {
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
  
  cvses.map(cvs => {
    if (cvs === mostSquare.cvs) return cvs;
  
    const heightRatio = cvs.height / mostSquare.height;
    const widthRatio = cvs.width / mostSquare.width;
    
    const smallest = Math.min(heightRatio, widthRatio);
    
    const scaled = makeCanvas();
    scaled.cvs.width = mostSquare.cvs.width;
    scaled.cvs.height = mostSquare.cvs.height;
    const sx = smallest === widthRatio ? 0 : ((cvs.width / widthRatio) / 2) - (mostSquare.cvs.width / 2);
    const sy = (cvs.height / 2 / 2);
    const swidth = mostSquare.cvs.width;
    const sheight = mostSquare.cvs.height;
    
    const dx = i * sliceWidth;
    const dy = y < 0 ? 0 : y;
    const dwidth = sliceWidth;
    const dheight = fgCvs.height;
    scaled.drawImage();
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
  
  // TODO: put frameNum into animState
  // TODO: how to generically scale the bg/fg consistently?
  
  let slicesRenderedThisFrame = 0;
  let bgCvs = cvses[bgIdx];
  let fgCvs = cvses[(bgIdx + 1) % cvses.length];
  let ys = animState.ys[bgIdx];
  
  // scratch.ctx.clearRect(0, 0, scratch.cvs.width, scratch.cvs.height);
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
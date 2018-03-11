import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import { doomRand } from './doom';
import { makeCanvas, downscaleToCanvas } from './utils';
import { blobToImage, } from 'image-juggler';
import { initAnimState, normalizeCvses, animStateFrame, } from './anim';

// BEGIN STATE MANAGEMENT

const defaultState = {
  errors: [],
  
  // the normalized canvas els
  cvses: [],
  // unnormalized, copied straight from an img
  bgCvs: null,
  fgCvs: null,

  numSlices: 400,
  maxStartOffset: 160, // pixels?
  initialVelocity: 1,
  acceleration: 0.1,
  totalStages: 0,
  finishedStages: 0,
  rendering: false,
  gifPercent: 0,
  gif: null,
  gifBlob: null,
};

export const createFrames = () => (dispatch, getState) => {
  const state = getState();

  // TODO: do some precondition checks here, like if both images
  // have been set. Dispatch errors if not.
  
  dispatch({ type: 'GIF_START' });
  
  const animState = initAnimState(
    //[state.bgCvs, state.fgCvs],
    state.cvses,
    parseInt(state.numSlices, 10),
    parseInt(state.maxStartOffset, 10),
    parseFloat(state.acceleration, 10),
    parseFloat(state.initialVelocity, 10));
  
  console.log('state', state, 'animState', animState)
  
  const gif = new GIF({
    workerScript: GIF_WORKER_PATH,
    workers: 2,
    quality: 40,
    // TODO: pull this out of the frames? Or pick a color that is opposite of avg.
    // transparent: 0x000,
  });
  
  gif.on('progress', percent => {
    dispatch({ type: 'GIF_PROGRESS', payload: percent });
  });

  gif.on('finished', function(blob) {
    // window.open(URL.createObjectURL(blob));
    blobToImage(blob, (err, img) => {
      dispatch({ type: 'GIF_COMPLETED', payload: { img, blob } });
    })
  }); 
  
  // Allow it to "loop" until finished
  const nextFrame = () => {
    dispatch({ type: 'INC_TOTAL_STAGES', payload: 1 });
    setTimeout(() => {
      
      // TODO: would be great to have an Option<ImageData> here...
      const imgData = animStateFrame(animState);
      dispatch({ type: 'INC_FINISHED_STAGES', payload: 1 });
      
      if (!imgData) {
        gif.render();
      } else {
        gif.addFrame(imgData, { delay: 16 });  
        nextFrame();
      }
    })
  }
  
  nextFrame();
}

export function reduceState(action, state=defaultState) {
  // Lol middleware
  if (action.error) {
    return { ...state, errors: [ ...state.errors, action.error ] };
  }
  
  if (action.type === 'IMAGE_LOAD') {
    const { layer } = action.payload;
    
    const pdr = window.pixelDeviceRatio || 1;
    const inputCvs = action.payload.cvs;
    
    // TODO: do this once we start computing the frames so a more
    // intelligent sizing can be done. (avg size between, for example)
    const downscaled = downscaleToCanvas(inputCvs,
      Math.min(inputCvs.width, window.screen.width * pdr),
      Math.min(inputCvs.height, window.screen.height * pdr));
    
    const cvses = [
      layer === 'background' ? downscaled : null,
      state.bgCvs,
      state.fgCvs,
      layer === 'foreground' ? downscaled : null,
    ].filter(Boolean);
    const normalized = normalizeCvses(cvses);
    
    // not always the fg, but good enough. We have to pick one
    // of them...
    const fg = normalized[normalized.length - 1];
    
    // doom used 16. ~200 / 16 == 12.5... 
    // But we've got different ratios than doom.
    const maxStartOffset = layer === 'foreground'
      ? fg.height // / (12.5 / 2)
      : state.maxStartOffset;
    const numSlices = layer === 'foreground'
      ? fg.width
      : state.numSlices;
    // doom had 200 height : 1 velocity
    const initialVelocity = layer === 'foreground'
      ? fg.height / 200
      : state.initialVelocity;
    
    return {
      ...state,
      fgCvs: layer === 'foreground' ? downscaled : state.fgCvs,
      bgCvs: layer === 'background' ? downscaled : state.bgCvs,
      cvses: normalized,
      maxStartOffset,
      numSlices,
      initialVelocity,
    };
  }
    
  if (action.type === 'ACCELERATION_CHANGE') {
    return { ...state, acceleration: action.payload };
  }
    
  if (action.type === 'INITIAL_VELOCITY_CHANGE') {
    return { ...state, initialVelocity: action.payload };
  }
  
  if (action.type === 'MAX_START_OFFSET_CHANGE') {
    return { ...state, maxStartOffset: action.payload };
  }
  
  if (action.type === 'SLICE_COUNT_CHANGE') {
    return { ...state, numSlices: action.payload };
  }

  if (action.type === 'INC_TOTAL_STAGES') {
    return { ...state, totalStages: state.totalStages + action.payload }; 
  }
  
  if (action.type === 'INC_FINISHED_STAGES') {
    return { ...state, finishedStages: state.finishedStages + action.payload }; 
  }
  
  if (action.type === 'GIF_START') {
    return {
      ...state,
      rendering: true,
      gifPercent: 0,
      gif: null,
      gifBlob: null,
      totalStages: 0,
      finishedStages: 0,
    };
  }
  
  if (action.type === 'GIF_PROGRESS') {
    return { ...state, gifPercent: action.payload };
  }
  
  if (action.type === 'GIF_COMPLETED') {
    // TODO: remove this once styling is more coherent
    action.payload.img.style.width = '100%';
    return {
      ...state,
      rendering: false,
      gif: action.payload.img,
      gifBlob: action.payload.blob,
    };
  }
  
  return state;
}

export const computePercentComplete = ({
  finishedStages,
  totalStages,
  gifPercent
}) => {
  const framePercent = finishedStages / (totalStages || 1);
  return ((gifPercent * 100 + framePercent * 100) / 2);
}
  
// END STATE MANAGEMENT
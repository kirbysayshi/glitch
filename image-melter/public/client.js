function fileToImage(file, opt_image, cb) {
  if (!cb) { cb = opt_image; opt_image = null; }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(file);
  img.onload = function() {
    URL.revokeObjectURL(url);
    cb(null, img);
  }
  img.src = url;
}

function imageToCanvas(image, opt_cvs, cb) {
  if (!cb) { cb = opt_cvs; opt_cvs = null; }
  var cvs = opt_cvs || document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = image.width;
  cvs.height = image.height;
  ctx.drawImage(image, 0, 0);
  cb(null, cvs);
}

function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
}

function onInputChangeReadValue(id, cb) {
  const input = document.querySelector(id);
  input.addEventListener('change', e => { e.stopPropagation(); cb(e.target.value) });
  input.addEventListener('keyup', e => { e.stopPropagation(); cb(e.target.value) });
}

function createSlice (cvs, sliceIdx, width) {
  const slice = {
    ...makeCanvas(),
    idx: sliceIdx,
  }

  slice.cvs.width = width;
  slice.cvs.height = cvs.height;
  slice.ctx.drawImage(cvs,
    sliceIdx * width, 0, width, cvs.height, 
    0, 0, width, cvs.height
  );
  
  return slice;
}

function createFrame (inputCvs, initialYs, verticalInc, slices, frameNum) {
  const { cvs, ctx } = makeCanvas();
  cvs.height = inputCvs.height;
  cvs.width = inputCvs.width;

  ctx.fillStyle = '#fff';
  
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const initialY = initialYs[i];
    const y = initialY + (verticalInc * frameNum);
    if (y > inputCvs.height) continue; // this slice is done
    // otherwise copy the slice appropriately!
    
    const sx = 0;
    const sy = 0;
    const swidth = slice.cvs.width;
    const sheight = slice.cvs.height;
    
    const dx = slice.idx * slice.cvs.width;
    const dy = y < 0 ? 0 : y;
    const dwidth = slice.cvs.width;
    const dheight = slice.cvs.height;
    
    ctx.fillRect(dx, 0, dwidth, dheight);
    ctx.drawImage(slice.cvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
  }
  
  return cvs;
}

const defaultState = {
  inputCvs: null,
  numSlices: 10,
  frames: [],
  maxStartOffset: 16, // pixels?
  verticalInc: 10,
  renderingGif: false,
  
  animation: {
    frameIdx: 0,
    rendering: false,
    cvs: null,
  }
};
  
  
function reduceState(action, state=defaultState) {
  if (action.type === 'IMAGE_LOAD') {
    return { ...state, inputCvs: action.payload };
  }
  
  if (action.type === 'VERTICAL_INC_CHANGE') {
    return { ...state, verticalInc: action.payload };
  }
  
  if (action.type === 'MAX_START_OFFSET_CHANGE') {
    return { ...state, maxStartOffset: action.payload };
  }
  
  if (action.type === 'SLICE_COUNT_CHANGE') {
    return { ...state, numSlices: action.payload };
  }
    
  if (action.type === 'RENDER_FRAMES') {
    if (!state.inputCvs) return state;
    
    // create slices
    const slices = [];
    const sliceWidth = state.inputCvs.width / state.numSlices;
    
    for (let i = 0; i < state.numSlices; i++) {
      slices.push(createSlice(state.inputCvs, i, sliceWidth));
    }
    
    // create initial ys
    const initialYs = [];
    for (let i = 0; i < state.numSlices; i++) {
      const r = Math.floor(Math.random() * 256);
      initialYs.push(-r % state.maxStartOffset);
    }
  
    // create frames
    const frames = [];
    const maxYTravel = -Math.min(...initialYs) + state.inputCvs.height;
    const frameCount = Math.ceil(maxYTravel / state.verticalInc);
    for (let i = 0; i <= frameCount; i++) {
      frames.push(createFrame(state.inputCvs, initialYs, state.verticalInc, slices, i)); 
    }
    
    return { ...state, renderingGif: true, frames };
  }
  
  if (action.type === 'GIF_COMPLETED') {
    return { ...state, renderingGif: false };
  }
  
//   if (action.type === 'INIT_ANIMATE_FRAMES') {
//     const { cvs, ctx } = makeCanvas();
//     cvs.width = state.inputCvs.width;
//     cvs.height = state.inputCvs.height;
    
//     return {
//       ...state,
//       animation: {
//         ...state.animation,
//         cvs: cvs,
//         rendering: true,
//         frameIdx: 0
//       }
//     }
//   }
  
  return state;
}

let AppState;
function dispatch(action) {
  AppState = reduceState(action, AppState);
  console.log('next state', AppState);
}

const melterInput = document.querySelector('#melter-input');
melterInput.addEventListener('change', e => {
  e.stopPropagation();
  fileToImage(e.target.files[0], (err, img) => {
    imageToCanvas(img, (err, cvs) => {
      dispatch({ type: 'IMAGE_LOAD', payload: cvs });
    });
  });
});

onInputChangeReadValue('#melter-slice-count', value => {
  dispatch({ type: 'SLICE_COUNT_CHANGE', payload: parseInt(value, 10) });
});
  
onInputChangeReadValue('#melter-vertical-inc', value => {
  dispatch({ type: 'VERTICAL_INC_CHANGE', payload: parseInt(value, 10) });
});

onInputChangeReadValue('#melter-max-start-offset', value => {
  dispatch({ type: 'MAX_START_OFFSET_CHANGE', payload: parseInt(value, 10) });
});  

document.querySelector('#melter-render').addEventListener('click', e => {
  
  if (AppState.renderingGif) return;
  
  dispatch({ type: 'RENDER_FRAMES' });
  
  const gifComplete = (obj) => {
    if(!obj.error) {
      var image = obj.image,
      animatedImage = document.createElement('img');
      animatedImage.src = image;
      document.body.appendChild(animatedImage);
    }
  }
  
  window.gifshot.createGIF({
    'images': [...AppState.frames],
    gifWidth: AppState.inputCvs.width,
    gifHeight: AppState.inputCvs.height,
    frameDuration: 0.5,
    progressCallback: (progress) => { console.log({ progress }) },
  }, gifComplete);
  
  // AppState.frames.forEach(frame => {
  //   frame.style.display = 'block';
  //   document.body.append(frame);
  // });
});

// (function animator(dt) {
//   if (AppState && AppState.animation.rendering && AppState.animation.cvs) {
    
//   }
//   window.requestAnimationFrame(animator);
// }());
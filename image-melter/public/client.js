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
  
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const initialY = initialYs[i];
    const y = initialY + (verticalInc * frameNum);
    if (y > inputCvs.height) continue; // this slice is done
    // otherwise copy the slice appropriately!
    ctx.drawImage(slice.cvs,
      0, 0, slice.cvs.width, slice.cvs.height,
      slice.idx * slice.cvs.width, y < 0 ? 0 : y, slice.cvs.width, slice.cvs.height
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
};
  
  
function reduceState(action, state=defaultState) {
  if (action.type === 'IMAGE_LOAD') {
    return { ...state, inputCvs: action.payload };
  }
  
  if (action.type === 'VERTICAL_INC_CHANGE') {
    return { ...state, verticalInc: action.payload };
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
    const frameCount = Math.ceil(state.inputCvs.height / state.verticalInc);
    for (let i = 0; i < frameCount; i++) {
      frames.push(createFrame(state.inputCvs, initialYs, state.verticalInc, slices, i)); 
    }
    
    return { ...state, frames };
  }
  
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

document.querySelector('#melter-render').addEventListener('click', e => {
  dispatch({ type: 'RENDER_FRAMES' });
});
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

function createSlice (cvs, sliceIdx, width) {
  const slice = {
    ...makeCanvas(),
    sliceIdx,
  }

  slice.cvs.width = width;
  slice.cvs.height = cvs.height;
  slice.ctx.drawImage(cvs,
    sliceIdx * width, 0, width, cvs.height, 
    0, 0, width, cvs.height
  );
  
  return slice;
}

const defaultState = {
  inputCvs: null,
  numSlices: 10,
  slices: [],
  ys: [],
  maxStartOffset: 16, // pixels?
};
  
  
function reduceState(action, state=defaultState) {
  if (action.type === 'IMAGE_LOAD') {
    return { ...state, inputCvs: action.payload };
  }
  
  if (action.type === 'SLICE_COUNT_CHANGE') {
    const numSlices = action.payload;
    const slices = [];
    const sliceWidth = (state.inputCvs ? state.inputCvs.width / numSlices : 0);
    
    if (state.inputCvs) { 
      for (let i = 0; i < numSlices; i++) {
        slices.push(createSlice(state.inputCvs, i, sliceWidth));
      }
    }
    
    return {
      ...state,
      numSlices,
      slices,
    }; 
  }
}

let AppState = {};
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
  
const sliceCountInput = document.querySelector('#melter-slice-count');
sliceCountInput.addEventListener('change', e => {
  dispatch({ type: 'SLICE_COUNT_CHANGE', payload: parseInt(e.target.value, 10) });
});
sliceCountInput.addEventListener('keyup', e => {
  dispatch({ type: 'SLICE_COUNT_CHANGE', payload: parseInt(e.target.value, 10) });
});
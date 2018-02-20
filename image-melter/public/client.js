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

function blobToImage(blob, opt_image, cb) {
  if (!cb) { cb = opt_image; opt_image = null; }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(blob);
  img.onload = function() {
    URL.revokeObjectURL(url);
    cb(null, img);
  }
  img.src = url;
}

function ll()

function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
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
  // TODO: should there be a background color?
  // Or just the original image for loop effect?
  // ctx.drawImage(inputCvs, 0, 0);
  
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const initialY = initialYs[i];
    const y = initialY + (verticalInc * frameNum);
    if (y > inputCvs.height) continue; // this slice is done
    
    const sx = 0;
    const sy = 0;
    const swidth = slice.cvs.width;
    const sheight = slice.cvs.height;
    
    const dx = slice.idx * slice.cvs.width;
    const dy = y < 0 ? 0 : y;
    const dwidth = slice.cvs.width;
    const dheight = slice.cvs.height;
    
    ctx.drawImage(slice.cvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
  }
  
  return cvs;
}

const defaultState = {
  inputCvs: null,
  numSlices: 400,
  frames: [],
  maxStartOffset: 160, // pixels?
  verticalInc: 10,
  renderingGif: false,
};

const doomRand = () => Math.floor(Math.random() * 256);
  
function reduceState(action, state=defaultState) {
  if (action.type === 'IMAGE_LOAD') {
    // TODO: use inputCvs.width to set a good initial slice count
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
    const desiredSlices = state.numSlices;
    const sliceWidth = Math.floor(state.inputCvs.width / state.numSlices);
    const actualNumSlices = Math.ceil(state.inputCvs.width / sliceWidth);
    for (let i = 0; i < actualNumSlices; i++) {
      slices.push(createSlice(state.inputCvs, i, sliceWidth));
    }
    
    // create initial ys
    const initialYs = [
      -doomRand() % state.maxStartOffset
    ];
    for (let i = 1; i < actualNumSlices; i++) {
      const prev = initialYs[i - 1];
      const maxInc = Math.floor(state.maxStartOffset / 10.333);
      const amount = maxInc * ((doomRand() % 3) - 1);
      const proposed = prev + amount;
      let r = proposed;
      if (proposed > 0) r = 0;
      else if (proposed < -state.maxStartOffset) r = -state.maxStartOffset + 1;
      initialYs.push(r);
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
  
  return state;
}

const labeledInput = (id, selector, action) => {
  return {
    el: () => document.querySelector(id),
    mounted: (desc) => {
      const el = desc.el();
      const handleUpdate = (e) => {
        e.stopPropagation();
        dispatch(desc.dispatch(e.target.value));
      }
      el.addEventListener('change', e => handleUpdate(e));
      el.addEventListener('keyup', e => handleUpdate(e));
    }, 
    select: selector,
    update: (el, state) => el.setAttribute("value", state),
    dispatch: value => ({
      type: action,
      payload: parseInt(value, 10)
    })
  }
}

const doms = [
  labeledInput(
    '#melter-slice-count',
    state => state.numSlices,
    'SLICE_COUNT_CHANGE'
  ),
  labeledInput(
    '#melter-vertical-inc',
    state => state.verticalInc,
    'VERTICAL_INC_CHANGE'
  ),
  labeledInput(
    '#melter-max-start-offset',
    state => state.maxStartOffset,
    'MAX_START_OFFSET_CHANGE'
  ),
  
  {
    el: () => document.querySelector("#melter-render"),
    mounted: (desc) => {
      desc.el().addEventListener('click', e => {
        if (AppState.renderingGif) return;

        dispatch({ type: 'RENDER_FRAMES' });

        // TODO: tell the user this is done and that GIF processing is starting!

        var gif = new window.GIF({
          workerScript: 'gif/gif.worker.js',
          workers: 2,
          quality: 10
        });

        AppState.frames.forEach(frame => {
          gif.addFrame(frame, { delay: 16 });
        });

        gif.on('finished', function(blob) {
          dispatch({ type: 'GIF_COMPLETED' });
          // window.open(URL.createObjectURL(blob));
          blobToImage(blob, (err, img) => {
            const dest = document.querySelector('#melter-render-output');
            dest.appendChild(img);
            // AppState.frames.forEach(frame => {
            //   frame.style.display = 'block';
            //   document.body.appendChild(frame);
            // });
          })
        });

        gif.render();
      });
    },
    select: state => state.renderingGif,
    update: (el, state) => {
      const value = state === true
        ? "RENDERING"
        : "Render";
      el.setAttribute("value", value);
    }
  },
  
  {
    el: () => document.querySelector("#melter-input"),
    mounted: (desc) => {
      desc.el().addEventListener('change', e => {
        e.stopPropagation();
        fileToImage(e.target.files[0], (err, img) => {
          imageToCanvas(img, (err, cvs) => {
            dispatch({ type: 'IMAGE_LOAD', payload: cvs });
          });
        });
      })
    },
    select: state => null,
    update: (el, state) => {}
  }
];

// Lol "lifecycle events for lyfe"
doms.forEach(desc => {
  const el = desc.el();
  desc.mounted(desc);
});

let AppState;
function dispatch(action) {
  let curr = AppState;
  AppState = reduceState(action, curr);
  console.log('next state', AppState);
  
  if (curr === AppState) return;
  
  // Update the "bindings"!
 
  doms.forEach(desc => {
    const el = desc.el();
    const value = desc.select(AppState);
    desc.update(el, value);
  });
}

// Make sure we have a good initial state.
dispatch({ type: '@@BOOT@@' });
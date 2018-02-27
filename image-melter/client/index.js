import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import exifOrient from 'exif-orient';
import { load as ExifReaderLoad } from 'exifreader';

import { fileToImage, imageToCanvas, blobToImage, fileToArrayBuffer, } from 'image-juggler';

function fileToRotatedCanvas(file, cb) {
  fileToImage(file, (err, img) => {
    // Only the first 128 bytes can contain exif data.
    const headerBytes = file.slice(0, 128 * 1024);
    fileToArrayBuffer(headerBytes, (err, ab) => {
      if (err) return cb(err);

      try {
        const tags = ExifReaderLoad(ab);
        const orientation = tags.Orientation;
        exifOrient(img, orientation.value, function (err, cvs) {
          if (err) return cb(err);
          return cb(null, cvs);
        }); 
      } catch (err) {
        // likely no exif tags found.
        imageToCanvas(img, (err, cvs) => {
          if (err) return cb(err);
          return cb(null, cvs);
        });
      }
    }) 
  })
}

const SAFARI_LOG = (text) => {
  const status = document.createElement('div');
  status.innerHTML = `<pre>${text}</pre>`;
  document.body.appendChild(status);
}

function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
}

function downscaleToCanvas(img, maxWidth, maxHeight) {
  const { cvs, ctx } = makeCanvas();  
  const ratio = img.width > img.height
    ? maxWidth / Math.max(img.width, maxWidth)
    : maxHeight / Math.max(img.height, maxHeight);
  cvs.width = img.width * ratio;
  cvs.height = img.height * ratio;
  const sx = 0;
  const sy = 0;
  const swidth = img.width;
  const sheight = img.height;
  const dx = 0;
  const dy = 0;
  const dwidth = cvs.width;
  const dheight = cvs.height;
  ctx.drawImage(img,
    sx, sy, swidth, sheight,
    dx, dy, dwidth, dheight
  );
  return cvs;
}

function initAnimState(inputCvs, requestedSliceCount, maxStartOffset, acceleration, initialVelocity) {
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

function animStateFrame(animState, frameNum) {
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

// https://github.com/id-Software/DOOM/blob/77735c3ff0772609e9c8d29e3ce2ab42ff54d20b/linuxdoom-1.10/m_random.c
const doomRand = () => Math.floor(Math.random() * 256);


// BEGIN STATE MANAGEMENT

const defaultState = {
  errors: [],
  inputCvs: null,
  numSlices: 400,
  maxStartOffset: 160, // pixels?
  initialVelocity: 1,
  acceleration: 0.1,
  totalStages: 0,
  finishedStages: 0,
  rendering: false,
  gifPercent: 0,
  gif: null,
};

const createFrames = () => (dispatch, getState) => {
  const state = getState();

  dispatch({ type: 'GIF_START' });
  
  const animState = initAnimState(
    state.inputCvs,
    parseInt(state.numSlices, 10),
    parseInt(state.maxStartOffset, 10),
    parseFloat(state.acceleration, 10),
    parseFloat(state.initialVelocity, 10));
  
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
      dispatch({ type: 'GIF_COMPLETED', payload: img });
    })
  }); 
  
  // Allow it to "loop" until finished
  const nextFrame = (idx) => {
    dispatch({ type: 'INC_TOTAL_STAGES', payload: 1 });
    setTimeout(() => {
      // TODO: would be great to have an Option<ImageData> here...
      const imgData = animStateFrame(animState, idx);
      if (!imgData) {
        // animation is done!  
        gif.render();
      } else {
        gif.addFrame(imgData, { delay: 16 });
        dispatch({ type: 'INC_FINISHED_STAGES', payload: 1 });
        nextFrame(idx + 1);
      }
    })
  }
  
  nextFrame(0);
}

function reduceState(action, state=defaultState) {
  // Lol middleware
  if (action.error) {
    return { ...state, errors: [ ...state.errors, action.error ] };
  }
  
  if (action.type === 'IMAGE_LOAD') {
    const inputCvs = action.payload;
    return {
      ...state,
      inputCvs,
      // doom used 16. ~200 / 16 == 12.5... 
      // But we've got different ratios than doom.
      maxStartOffset: inputCvs.height / (12.5 / 2),
      numSlices: inputCvs.width,
      // doom had 200 height : 1 velocity
      initialVelocity: inputCvs.height / 200,
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
      totalStages: 0,
      finishedStages: 0,
    };
  }
  
  if (action.type === 'GIF_PROGRESS') {
    return { ...state, gifPercent: action.payload };
  }
  
  if (action.type === 'GIF_COMPLETED') {
    // TODO: remove this once styling is more coherent
    action.payload.style.width = '100%';
    return { ...state, rendering: false, gif: action.payload };
  }
  
  return state;
}

const computePercentComplete = ({
  finishedStages,
  totalStages,
  gifPercent
}) => {
  const framePercent = finishedStages / (totalStages || 1);
  return ((gifPercent * 100 + framePercent * 100) / 2);
}
  
// END STATE MANAGEMENT

// BEGIN RENDER RENDER RENDER

import { h, Component, render as PreactRender } from 'preact';

const LabeledInput = ({ labelText, value, onChange }) => {
  const readVal = (e) => onChange(e.target.value);
  return h('label', null, [
    labelText,
    h('input', {
      type: 'text',
      inputmode: 'numeric',
      value,
      onchange: readVal,
      onkeyup: readVal,
    })
  ]);
}

class RenderButton extends Component {
  
  render (props) {
    const {
      dispatch,
      app: { rendering }
    } = props;
    
    const percent = computePercentComplete(props.app).toFixed(2);
    const value = rendering === true
      ? `RENDERING ${percent}%`
      : "Render";

    return h('input', {
      type: 'button',
      value,
      disabled: rendering ? 'disabled' : null,
      onclick: () => {
        if (rendering) return;
        dispatch(createFrames());
      }
    });
  }
}

class ElHolder extends Component {
  shouldComponentUpdate() { return false; }

  componentWillReceiveProps(nextProps) {
    if (!this.props.el) {
      this.base.innerHTML = '';  
    }
    
    if (nextProps.el) {
      this.base.appendChild(nextProps.el);    
    }
  }

  render() {
    return h('div', null, '');
  }
}

class InputPanel extends Component {  
  render(props) {
    const {
      dispatch,
      app: {
        numSlices,
        acceleration,
        initialVelocity,
        maxStartOffset,
        gif,
      },
    } = props;
    return h('form', null, [
      h('input', {
        type: 'file',
        onchange: (e) => {
          const file = e.target.files[0];
          fileToRotatedCanvas(file, (err, cvs) => {
            if (err) return dispatch({ error: err });
            const downscaled = downscaleToCanvas(cvs,
              window.screen.width * (window.pixelDeviceRatio || 1),
              window.screen.height * (window.pixelDeviceRatio || 1))
            dispatch({ type: 'IMAGE_LOAD', payload: downscaled });
          });
        }
      }),
      
      LabeledInput({
        labelText: 'Vertical Slices',
        value: numSlices,
        onChange: (value) => dispatch({
          type: 'SLICE_COUNT_CHANGE',
          payload: value,
        })
      }),
      
      LabeledInput({
        labelText: 'Initial Velocity',
        value: initialVelocity,
        onChange: (value) => dispatch({
          type: 'INITIAL_VELOCITY_CHANGE',
          payload: value,
        })
      }),
      
      LabeledInput({
        labelText: 'Acceleration',
        value: acceleration,
        onChange: (value) => dispatch({
          type: 'ACCELERATION_CHANGE',
          payload: value,
        })
      }),
      
      LabeledInput({
        labelText: 'Maximum Start Offset',
        value: maxStartOffset,
        onChange: (value) => dispatch({
          type: 'MAX_START_OFFSET_CHANGE',
          payload: value,
        })
      }),
      
      h(RenderButton, props),
    ]);
  }
}

const AppContainer = (props) => {
  return h('div', null, [
    props.app.errors.map(err => h('div', null, err.message)),
    h(InputPanel, props),
    h(ElHolder, { el: props.app.gif }),
  ])
}

// END RENDER RENDER RENDER


// BEGIN APP BOOT PROCESS
let AppState;
function dispatch(action) {
  let curr = AppState;
  
  if (typeof action === 'function') {
    // It's a thunk!
    action(dispatch, () => curr);
    return;
  }
  
  AppState = reduceState(action, curr);
  
  if (curr === AppState) return;
  
  render();
}

const DomRoot = document.querySelector('#preact-root');
let AppDom;
function render() {
  const app = h(AppContainer, { app: AppState, dispatch });
  AppDom = PreactRender(app, DomRoot, AppDom);
}

// Make sure we have a good initial state.
dispatch({ type: '@@BOOT@@' });

render();
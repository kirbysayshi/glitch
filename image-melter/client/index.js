import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import exifOrient from 'exif-orient';
// import EXIF from 'exif-js';
import { load as ExifReaderLoad } from 'exifreader';

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

function fileToArrayBuffer(file, cb) {
  var reader = new FileReader();
  reader.onload = function() {
    cb(reader.error, reader.result);
  }
  reader.readAsArrayBuffer(file);
}

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

function drawFrame (inputCvs, scratchCvs, initialYs, verticalInc, sliceCount, sliceWidth, frameNum) {
  const cvs = scratchCvs;
  const ctx = scratchCvs.getContext('2d');
  ctx.fillStyle = '#fff';
  // TODO: should there be a background color?
  // Or just the original image for loop effect?
  // ctx.drawImage(inputCvs, 0, 0);
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  
  // TODO: add an acceleration to the Ys.
  for (let i = 0; i < sliceCount; i++) {
    // const slice = slices[i];
    const initialY = initialYs[i];
    const y = initialY + (verticalInc * frameNum);
    if (y > inputCvs.height) continue; // this slice is done
    
    const sx = i * sliceWidth;
    const sy = 0;
    const swidth = sliceWidth;
    const sheight = inputCvs.height;
    
    const dx = i * sliceWidth;
    const dy = y < 0 ? 0 : y;
    const dwidth = sliceWidth;
    const dheight = inputCvs.height;
    
    ctx.drawImage(inputCvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
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
  verticalInc: 10,
  renderingFrames: false,
  processingStepsTotal: 0,
  processingStepsFinished: 0,
  renderingGif: false,
  gifPercent: 0,
  gif: null,
};


const SAFARI_LOG = (text) => {
  const status = document.createElement('div');
  status.innerHTML = `<pre>${text}</pre>`;
  document.body.appendChild(status);
}

const createFrames = () => (dispatch, getState) => {
  const state = getState();

  dispatch({ type: 'SET_TOTAL_PROCESSING_STEPS', payload: 0 });
  
  // compute slices
  const sliceWidth = Math.floor(state.inputCvs.width / state.numSlices) || 1;
  const sliceCount = Math.ceil(state.inputCvs.width / sliceWidth);
  
  // create initial ys
  const initialYs = [
    -doomRand() % state.maxStartOffset
  ];
  for (let i = 1; i < sliceCount; i++) {
    const prev = initialYs[i - 1];
    const maxInc = Math.floor(state.maxStartOffset / 10.333);
    const amount = maxInc * ((doomRand() % 3) - 1);
    const proposed = prev + amount;
    let r = proposed;
    if (proposed > 0) r = 0;
    else if (proposed < -state.maxStartOffset) r = -state.maxStartOffset + 1;
    initialYs.push(r);
  }
  
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
  
  // create frames
  const maxYTravel = -initialYs.reduce((a, b) => Math.min(a, b)) + state.inputCvs.height;
  const frameCount = Math.ceil(maxYTravel / state.verticalInc);
  dispatch({ type: 'INC_TOTAL_PROCESSING_STEPS', payload: frameCount });
  const scratch = makeCanvas();
  scratch.cvs.width = state.inputCvs.width;
  scratch.cvs.height = state.inputCvs.height;
  for (let i = 0; i <= frameCount; i++) {
    const idx = i;
    setTimeout(() => {
      drawFrame(state.inputCvs, scratch.cvs, initialYs, state.verticalInc, sliceCount, sliceWidth, idx);
      const imgData = scratch.ctx.getImageData(0, 0, scratch.cvs.width, scratch.cvs.height);
      gif.addFrame(imgData, { delay: 16 });
      dispatch({ type: 'INC_FINISHED_PROCESSING_STEPS', payload: 1 });
    }, 1);
  }
  
  setTimeout(() => {
    // if the event loop works right... when this baby hits 88 miles per hour...
    // all the previous tasks will have completed.
    gif.render();
  }, 1)
}

function reduceState(action, state=defaultState) {
  // Lol middleware
  if (action.error) {
    return { ...state, errors: [ ...state.errors, action.error ] };
  }
  
  if (action.type === 'IMAGE_LOAD') {
    // TODO: use inputCvs.width to set a good initial slice count
    const inputCvs = action.payload;
    return { ...state, inputCvs, };
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

  if (action.type === 'INC_TOTAL_PROCESSING_STEPS') {
    return { ...state, processingStepsTotal: state.processingStepsTotal + action.payload }; 
  }
  
  if (action.type === 'INC_FINISHED_PROCESSING_STEPS') {
    return { ...state, processingStepsFinished: state.processingStepsFinished + action.payload }; 
  }
  
  if (action.type === 'GIF_START') {
    return { ...state, renderingGif: true, gifPercent: 0, gif: null };
  }
  
  if (action.type === 'GIF_PROGRESS') {
    return { ...state, gifPercent: action.payload };
  }
  
  if (action.type === 'GIF_COMPLETED') {
    return { ...state, renderingGif: false, gif: action.payload };
  }
  
  return state;
}

// END STATE MANAGEMENT

// BEGIN RENDER RENDER RENDER

// const { h, Component, render: PreactRender } = require('preact');
import { h, Component, render as PreactRender } from 'preact';

const LabeledInput = ({ labelText, value, onChange }) => {
  const readVal = (e) => onChange(e.target.value);
  return h('label', null, [
    labelText,
    h('input', {
      type: 'text',
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
      app: { renderingGif, gifPercent, renderingFrames, processingStepsTotal, processingStepsFinished  }
    } = props;
    
    const framePercent = processingStepsFinished / (processingStepsTotal || 1);
    const percent = ((gifPercent * 100 + framePercent * 100) / 2).toFixed(2);
    
    const value = renderingGif === true
      ? `RENDERING ${percent}%`
      : "Render";

    return h('input', {
      type: 'button',
      value,
      disabled: renderingGif ? 'disabled' : null,
      onclick: () => {
        if (renderingFrames || renderingGif) return;
        dispatch({ type: 'GIF_START' });
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
        verticalInc,
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
          payload: parseInt(value, 10) || 0,
        })
      }),
      
      LabeledInput({
        labelText: 'Vertical Increment',
        value: verticalInc,
        onChange: (value) => dispatch({
          type: 'VERTICAL_INC_CHANGE',
          payload: parseInt(value, 10) || 0
        })
      }),
      
      LabeledInput({
        labelText: 'Maximum Start Offset',
        value: maxStartOffset,
        onChange: (value) => dispatch({
          type: 'MAX_START_OFFSET_CHANGE',
          payload: parseInt(value, 10) || 0
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
    h('div', { style: { width: '100%' } }, h(ElHolder, { el: props.app.gif }))
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
  // console.log('next state', AppState);
  
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
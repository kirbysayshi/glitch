import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import writegif from 'writegif';

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

function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
}

function downscaleImageToCanvas(img, maxWidth, maxHeight) {
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

function createSlice (cvs, sliceIdx, width) {
  const slice = {
    idx: sliceIdx,
    width,
    height: cvs.height,
  }
  
  return slice;
}

function createFrame (inputCvs, scratchCvs, initialYs, verticalInc, slices, frameNum) {
  // const { cvs, ctx } = makeCanvas();
  // cvs.height = inputCvs.height;
  // cvs.width = inputCvs.width;

  const cvs = scratchCvs;
  const ctx = scratchCvs.getContext('2d');
  ctx.fillStyle = '#fff';
  // TODO: should there be a background color?
  // Or just the original image for loop effect?
  // ctx.drawImage(inputCvs, 0, 0);
  
  // TODO: add an acceleration to the Ys.
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const initialY = initialYs[i];
    const y = initialY + (verticalInc * frameNum);
    if (y > inputCvs.height) continue; // this slice is done
    
    const sx = slice.idx * slice.width;
    const sy = 0;
    const swidth = slice.width;
    const sheight = slice.height;
    
    const dx = slice.idx * slice.width;
    const dy = y < 0 ? 0 : y;
    const dwidth = slice.width;
    const dheight = slice.height;
    
    ctx.drawImage(inputCvs,
      sx, sy, swidth, sheight,
      dx, dy, dwidth, dheight
    );
  }
  
  // return cvs;
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

// https://github.com/id-Software/DOOM/blob/77735c3ff0772609e9c8d29e3ce2ab42ff54d20b/linuxdoom-1.10/m_random.c
const doomRand = () => Math.floor(Math.random() * 256);


// BEGIN STATE MANAGEMENT

const defaultState = {
  inputCvs: null,
  numSlices: 400,
  frames: [],
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

const asyncCreateFrames = () => (dispatch, getState) => {
  const state = getState();

  dispatch({ type: 'SET_TOTAL_PROCESSING_STEPS', payload: 0 });
  
  // create slices
  const slices = [];
  const sliceWidth = Math.floor(state.inputCvs.width / state.numSlices) || 1;
  const actualNumSlices = Math.ceil(state.inputCvs.width / sliceWidth);
  // SAFARI_LOG(`desired: ${state.numSlices}`);
  // SAFARI_LOG(`width: ${state.inputCvs.width}`);
  // SAFARI_LOG(`sliceWidth: ${sliceWidth}`);
  // SAFARI_LOG(actualNumSlices);
  dispatch({ type: 'INC_TOTAL_PROCESSING_STEPS', payload: actualNumSlices });
  for (let i = 0; i < actualNumSlices; i++) {
    const idx = i;
    // setTimeout(() => {
      slices.push(createSlice(state.inputCvs, idx, sliceWidth));
      dispatch({ type: 'INC_FINISHED_PROCESSING_STEPS', payload: 1 });
    // });
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
  
  // {
  //   const status = document.createElement('div');
  //   status.innerHTML = `<pre>ys: ${initialYs.join(',')}</pre>`;
  //   document.body.appendChild(status);
  // }
  
  // create frames
  const frames = [];
  const maxYTravel = -initialYs.reduce((a, b) => Math.min(a, b)) + state.inputCvs.height;
  const frameCount = Math.ceil(maxYTravel / state.verticalInc);
  dispatch({ type: 'INC_TOTAL_PROCESSING_STEPS', payload: frameCount });
  {
    const status = document.createElement('div');
    status.innerHTML = `<pre>frame count: ${frameCount}</pre>`;
    document.body.appendChild(status);
  }
  const scratch = makeCanvas();
  scratch.cvs.width = state.inputCvs.width;
  scratch.cvs.height = state.inputCvs.height;
  for (let i = 0; i <= frameCount; i++) {
    const idx = i;
    setTimeout(() => {
      frames.push(createFrame(state.inputCvs, scratch.cvs, initialYs, state.verticalInc, slices, idx));
      
//       frames[frames.length-1].style.display = 'block';
//       document.body.appendChild(frames[frames.length-1]);
      
      dispatch({ type: 'INC_FINISHED_PROCESSING_STEPS', payload: 1 });
    }, 100);
  }
  
  setTimeout(() => {
    // if the event loop works right... when this baby hits 88 miles per hour...
    // all the previous tasks will have completed.
    // dispatch(asyncMakeGif(frames));
    
    const img = {
      width: state.inputCvs.width,
      height: state.inputCvs.height,
      frames: frames.map(f => ({
        data: f.data,
        delay: 16
      }))
    }
    
    writegif(img, (err, buffer) => {
      SAFARI_LOG(`rendered? ${err} ${buffer.length}`)  
    });
  });
}

const asyncMakeGif = (frames) => (dispatch, getState) => {
  var gif = new GIF({
    workerScript: GIF_WORKER_PATH,
    workers: 2,
    quality: 40,
    // TODO: pull this out of the frames? Or pick a color that is opposite of avg.
    // transparent: 0x000,
  });

  frames.forEach(frame => {
    gif.addFrame(frame, { delay: 16 });
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

  gif.render();
}


function reduceState(action, state=defaultState) {
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

  if (action.type === 'FRAMES_START') {
    return { ...state, renderingFrames: true, processingStepsTotal: 0, processingStepsFinished: 0 }; 
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

        // ensure we get at least a tick to update UI before RENDER_FRAMES
        // locks up...
        setTimeout(() => {
          dispatch(asyncCreateFrames());
          //dispatch({ type: 'RENDER_FRAMES' });
          // this.makeGif(props);
        }, 100);
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

  componentDidMount() {
    // now mounted, can freely modify the DOM:
    
  }

  componentWillUnmount() {
    // component is about to be removed from the DOM, perform any cleanup.
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
          fileToImage(e.target.files[0], (err, img) => {
            const cvs = downscaleImageToCanvas(img,
              window.screen.width * (window.pixelDeviceRatio || 1),
              // 1024,
              window.screen.height * (window.pixelDeviceRatio || 1));
              // 1024);
              dispatch({ type: 'IMAGE_LOAD', payload: cvs });
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
    h(InputPanel, props),
    h(ElHolder, { el: props.app.inputCvs }),
    h(ElHolder, { el: props.app.gif })
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
  console.log('next state', AppState);
  
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
import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import { blobToImage, } from 'image-juggler';

import { doomRand } from './doom';
import { fileToRotatedCanvas } from './orient-cvs';
import { makeCanvas, downscaleToCanvas } from './utils';
import { initAnimState, animStateFrame, } from './anim';

// BEGIN STATE MANAGEMENT

const defaultState = {
  errors: [],
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
};

const createFrames = () => (dispatch, getState) => {
  const state = getState();

  dispatch({ type: 'GIF_START' });
  
  const animState = initAnimState(
    [state.bgCvs, state.fgCvs],
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
  let nullOnce = false;
  const nextFrame = (idx) => {
    dispatch({ type: 'INC_TOTAL_STAGES', payload: 1 });
    setTimeout(() => {
      
      // TODO: would be great to have an Option<ImageData> here...
      const imgData = animStateFrame(animState, idx);
      dispatch({ type: 'INC_FINISHED_STAGES', payload: 1 });
      
      if (!imgData) {
        if (nullOnce) {
          // animation is done!  
          gif.render();
        } else {
          nullOnce = true; 
          nextFrame(0);
        }  
      } else {
        gif.addFrame(imgData, { delay: 16 });  
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
    const { cvs, layer } = action.payload;
    const downscaled = downscaleToCanvas(cvs,
      Math.min(cvs.width, window.screen.width * (window.pixelDeviceRatio || 1)),
      Math.min(cvs.height, window.screen.height * (window.pixelDeviceRatio || 1)));
    
    // doom used 16. ~200 / 16 == 12.5... 
    // But we've got different ratios than doom.
    const maxStartOffset = layer === 'foreground'
      ? downscaled.height / (12.5 / 2)
      : state.maxStartOffset;
    const numSlices = layer === 'foreground'
      ? downscaled.width
      : state.numSlices;
    // doom had 200 height : 1 velocity
    const initialVelocity = layer === 'foreground'
      ? downscaled.height / 200
      : state.initialVelocity;
    
    return {
      ...state,
      fgCvs: layer === 'foreground' ? downscaled : state.fgCvs,
      bgCvs: layer === 'background' ? downscaled : state.bgCvs,

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
      
      h('label', null, [
        'Background Image',
        h('input', {
          type: 'file',
          onchange: (e) => {
            const file = e.target.files[0];
            fileToRotatedCanvas(file, (err, cvs) => {
              if (err) return dispatch({ error: err });
              dispatch({ type: 'IMAGE_LOAD', payload: { cvs, layer: 'background', }});
            });
          }
        })
        
      ]),
      
      h('label', null, [
        'Foreground Image',
        h('input', {
          type: 'file',
          onchange: (e) => {
            const file = e.target.files[0];
            fileToRotatedCanvas(file, (err, cvs) => {
              if (err) return dispatch({ error: err });
              dispatch({ type: 'IMAGE_LOAD', payload: { cvs, layer: 'foreground', }});
            });
          }
        })
      ]),
      
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
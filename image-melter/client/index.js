/** @jsx h */
import GIF from 'gif.js';
const GIF_WORKER_PATH = 'gif.worker.js';

import { imageToCanvas, } from 'image-juggler';
import { default as FileSaver } from 'file-saver';

import { doomRand } from './doom';
import { fileToRotatedCanvas } from './orient-cvs';
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

const createFrames = () => (dispatch, getState) => {
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
  // let nullOnce = false;
  const nextFrame = () => {
    dispatch({ type: 'INC_TOTAL_STAGES', payload: 1 });
    setTimeout(() => {
      
      // TODO: would be great to have an Option<ImageData> here...
      const imgData = animStateFrame(animState);
      dispatch({ type: 'INC_FINISHED_STAGES', payload: 1 });
      
      if (!imgData) {
        // if (nullOnce) {
        //   // animation is done!  
          gif.render();
        // } else {
        //   // nullOnce = true; 
        //   nextFrame();
        // }  
      } else {
        gif.addFrame(imgData, { delay: 16 });  
        nextFrame();
      }
    })
  }
  
  nextFrame();
}

function reduceState(action, state=defaultState) {
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

    return <DOSButton
      disabled={rendering ? 'disabled' : null}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (rendering) return;
        dispatch(createFrames());
      }}
    >{value}</DOSButton>
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

import styled from 'styled-components';

const DOSFileInput = styled.input`
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;      
`;

const DOSLabel = styled.label`
  display: block;
  overflow: hidden;
  margin-bottom: 10px;
  padding: 5px;
  width: 100%;
  //border: 1px solid lightgrey;
  border-radius: 0px;
  //font-size: 16px;
  background-color: magenta;
  color: white;
`;

const DOSButton = DOSLabel.withComponent('button');

const DOSTextInput = styled.input`
  padding: 0;
  width: 20%;
  float: right;
  text-align: right;
  border: 0;
  color: white;
  background-color: magenta;
`;

// TODO: make this stateful so it can display the selected file name
// TODO: drag n drop is now broken by hiding the input! How to fix???
const DOSImageInputButton = ({ text, onFile }) => {
  return (
    <DOSLabel>
      { text }
      <DOSFileInput
        type='file'
        accept='image/*'
        onChange={e => onFile(e.target.files[0])}
      />
    </DOSLabel>
  )
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
      
      <DOSImageInputButton
        text='Choose Background Image'
        onFile={file => {
          fileToRotatedCanvas(file, (err, cvs) => {
            if (err) return dispatch({ error: err });
            dispatch({ type: 'IMAGE_LOAD', payload: { cvs, layer: 'background', }});
          });
        }}
      />,
      
      <DOSImageInputButton
        text='Choose Foreground Image'
        onFile={file => {
          fileToRotatedCanvas(file, (err, cvs) => {
            if (err) return dispatch({ error: err });
            dispatch({ type: 'IMAGE_LOAD', payload: { cvs, layer: 'foreground', }});
          });
        }}
      />,
      
      <DOSLabel>
        Vertical Slices
        <DOSTextInput
          inputmode='numeric'
          value={numSlices}
          onChange={({ target: { value } }) => dispatch({
            type: 'SLICE_COUNT_CHANGE',
            payload: value,
          })}
        />
      </DOSLabel>,
      
      // LabeledInput({
      //   labelText: 'Vertical Slices',
      //   value: numSlices,
      //   onChange: (value) => dispatch({
      //     type: 'SLICE_COUNT_CHANGE',
      //     payload: value,
      //   })
      // }),
      
      <DOSLabel>
        Initial Velocity
        <DOSTextInput
          inputmode='numeric'
          value={initialVelocity}
          onChange={({ target: { value } }) => dispatch({
            type: 'INITIAL_VELOCITY_CHANGE',
            payload: value,
          })}
        />
      </DOSLabel>,
      
      // LabeledInput({
      //   labelText: 'Initial Velocity',
      //   value: initialVelocity,
      //   onChange: (value) => dispatch({
      //     type: 'INITIAL_VELOCITY_CHANGE',
      //     payload: value,
      //   })
      // }),
      
      <DOSLabel>
        Acceleration
        <DOSTextInput
          inputmode='numeric'
          value={acceleration}
          onChange={({ target: { value } }) => dispatch({
            type: 'ACCELERATION_CHANGE',
            payload: value,
          })}
        />
      </DOSLabel>,
      
      // LabeledInput({
      //   labelText: 'Acceleration',
      //   value: acceleration,
      //   onChange: (value) => dispatch({
      //     type: 'ACCELERATION_CHANGE',
      //     payload: value,
      //   })
      // }),
      
      <DOSLabel>
        Maximum Start Offset
        <DOSTextInput
          inputmode='numeric'
          value={maxStartOffset}
          onChange={({ target: { value } }) => dispatch({
            type: 'MAX_START_OFFSET_CHANGE',
            payload: value,
          })}
        />
      </DOSLabel>,
      
      // LabeledInput({
      //   labelText: 'Maximum Start Offset',
      //   value: maxStartOffset,
      //   onChange: (value) => dispatch({
      //     type: 'MAX_START_OFFSET_CHANGE',
      //     payload: value,
      //   })
      // }),
      
      h(RenderButton, props),
    ]);
  }
}

const AppContainer = (props) => {
  return h('div', null, [
    props.app.errors.map(err => h('div', null, err.message)),
    h(InputPanel, props),
    h(ElHolder, { el: props.app.gif }),
    props.app.gifBlob && h('a', {
      href: '#',
      download: 'melted.gif',
      onclick: e => {
        e.preventDefault();
        e.stopPropagation();
        FileSaver.saveAs(props.app.gifBlob, 'melted.gif');
      },
    }, 'Download Image')
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
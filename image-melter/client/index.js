const GIF = require('gif.js');
const GIF_WORKER_PATH = 'gif.worker.js';

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

// https://github.com/id-Software/DOOM/blob/77735c3ff0772609e9c8d29e3ce2ab42ff54d20b/linuxdoom-1.10/m_random.c
const doomRand = () => Math.floor(Math.random() * 256);


// BEGIN STATE MANAGEMENT

const defaultState = {
  inputCvs: null,
  numSlices: 400,
  frames: [],
  maxStartOffset: 160, // pixels?
  verticalInc: 10,
  renderingGif: false,
  gifPercent: 0,
  gif: null,
};

// TODO: replace all the ... with Object.assign, sigh. Or add babel + browserify...

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
    
    return { ...state, frames };
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

const { h, Component, render: PreactRender } = require('preact');

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
  
  makeGif ({
    dispatch,
    app: {
      frames
    }
  }) {
    var gif = new GIF({
      workerScript: GIF_WORKER_PATH,
      workers: 2,
      quality: 10
    });

    AppState.frames.forEach(frame => {
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
  
  render (props) {
    
    const {
      dispatch,
      app: { renderingGif, gifPercent }
    } = props;
    
    const value = renderingGif === true
      ? `RENDERING ${(gifPercent * 100).toFixed(2)}%`
      : "Render";

    return h('input', {
      type: 'button',
      value,
      disabled: renderingGif ? 'disabled' : null,
      onclick: () => {
        if (renderingGif) return;

        dispatch({ type: 'GIF_START' });

        // ensure we get at least a tick to update UI before RENDER_FRAMES
        // locks up...
        setTimeout(() => {
          dispatch({ type: 'RENDER_FRAMES' });
          this.makeGif(props);
        }, 100);
      }
    });
  }
}

class ImgHolder extends Component {
  shouldComponentUpdate() { return false; }

  componentWillReceiveProps(nextProps) {
    if (!this.props.img) {
      this.base.innerHTML = '';  
    }
    
    if (nextProps.img) {
      this.base.appendChild(nextProps.img);    
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
            imageToCanvas(img, (err, cvs) => {
              dispatch({ type: 'IMAGE_LOAD', payload: cvs });
            });
          });  
        }
      }),
      
      LabeledInput({
        labelText: 'Vertical Slices',
        value: numSlices,
        onChange: (value) => dispatch({
          type: 'SLICE_COUNT_CHANGE',
          payload: parseInt(value, 10)  
        })
      }),
      
      LabeledInput({
        labelText: 'Vertical Increment',
        value: verticalInc,
        onChange: (value) => dispatch({
          type: 'VERTICAL_INC_CHANGE',
          payload: parseInt(value, 10)  
        })
      }),
      
      LabeledInput({
        labelText: 'Maximum Start Offset',
        value: maxStartOffset,
        onChange: (value) => dispatch({
          type: 'MAX_START_OFFSET_CHANGE',
          payload: parseInt(value, 10)  
        })
      }),
      
      h(RenderButton, props),
    ]);
  }
}

const AppContainer = (props) => {
  return h('div', null, [
    h(InputPanel, props),
    h(ImgHolder, { img: props.app.gif })
  ])
}

// END RENDER RENDER RENDER


// BEGIN APP BOOT PROCESS
let AppState;
function dispatch(action) {
  let curr = AppState;
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
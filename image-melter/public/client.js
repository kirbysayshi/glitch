/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function fileToImage(file, opt_image, cb) {
  if (!cb) {
    cb = opt_image;opt_image = null;
  }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(file);
  img.onload = function () {
    URL.revokeObjectURL(url);
    cb(null, img);
  };
  img.src = url;
}

function imageToCanvas(image, opt_cvs, cb) {
  if (!cb) {
    cb = opt_cvs;opt_cvs = null;
  }
  var cvs = opt_cvs || document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = image.width;
  cvs.height = image.height;
  ctx.drawImage(image, 0, 0);
  cb(null, cvs);
}

function blobToImage(blob, opt_image, cb) {
  if (!cb) {
    cb = opt_image;opt_image = null;
  }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(blob);
  img.onload = function () {
    URL.revokeObjectURL(url);
    cb(null, img);
  };
  img.src = url;
}

function makeCanvas() {
  var cvs = document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  return { cvs: cvs, ctx: ctx };
}

function createSlice(cvs, sliceIdx, width) {
  var slice = _extends({}, makeCanvas(), {
    idx: sliceIdx
  });

  slice.cvs.width = width;
  slice.cvs.height = cvs.height;
  slice.ctx.drawImage(cvs, sliceIdx * width, 0, width, cvs.height, 0, 0, width, cvs.height);

  return slice;
}

function createFrame(inputCvs, initialYs, verticalInc, slices, frameNum) {
  var _makeCanvas = makeCanvas(),
      cvs = _makeCanvas.cvs,
      ctx = _makeCanvas.ctx;

  cvs.height = inputCvs.height;
  cvs.width = inputCvs.width;

  ctx.fillStyle = '#fff';
  // TODO: should there be a background color?
  // Or just the original image for loop effect?
  // ctx.drawImage(inputCvs, 0, 0);

  for (var i = 0; i < slices.length; i++) {
    var slice = slices[i];
    var initialY = initialYs[i];
    var y = initialY + verticalInc * frameNum;
    if (y > inputCvs.height) continue; // this slice is done

    var sx = 0;
    var sy = 0;
    var swidth = slice.cvs.width;
    var sheight = slice.cvs.height;

    var dx = slice.idx * slice.cvs.width;
    var dy = y < 0 ? 0 : y;
    var dwidth = slice.cvs.width;
    var dheight = slice.cvs.height;

    ctx.drawImage(slice.cvs, sx, sy, swidth, sheight, dx, dy, dwidth, dheight);
  }

  return cvs;
}

// https://github.com/id-Software/DOOM/blob/77735c3ff0772609e9c8d29e3ce2ab42ff54d20b/linuxdoom-1.10/m_random.c
var doomRand = function doomRand() {
  return Math.floor(Math.random() * 256);
};

// BEGIN STATE MANAGEMENT

var defaultState = {
  inputCvs: null,
  numSlices: 400,
  frames: [],
  maxStartOffset: 160, // pixels?
  verticalInc: 10,
  renderingGif: false,
  gifPercent: 0,
  gif: null
};

// TODO: replace all the ... with Object.assign, sigh. Or add babel + browserify...

function reduceState(action) {
  var state = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultState;

  if (action.type === 'IMAGE_LOAD') {
    // TODO: use inputCvs.width to set a good initial slice count
    return _extends({}, state, { inputCvs: action.payload });
  }

  if (action.type === 'VERTICAL_INC_CHANGE') {
    return _extends({}, state, { verticalInc: action.payload });
  }

  if (action.type === 'MAX_START_OFFSET_CHANGE') {
    return _extends({}, state, { maxStartOffset: action.payload });
  }

  if (action.type === 'SLICE_COUNT_CHANGE') {
    return _extends({}, state, { numSlices: action.payload });
  }

  if (action.type === 'RENDER_FRAMES') {
    if (!state.inputCvs) return state;

    // create slices
    var slices = [];
    var desiredSlices = state.numSlices;
    var sliceWidth = Math.floor(state.inputCvs.width / state.numSlices);
    var actualNumSlices = Math.ceil(state.inputCvs.width / sliceWidth);
    for (var i = 0; i < actualNumSlices; i++) {
      slices.push(createSlice(state.inputCvs, i, sliceWidth));
    }

    // create initial ys
    var initialYs = [-doomRand() % state.maxStartOffset];
    for (var _i = 1; _i < actualNumSlices; _i++) {
      var prev = initialYs[_i - 1];
      var maxInc = Math.floor(state.maxStartOffset / 10.333);
      var amount = maxInc * (doomRand() % 3 - 1);
      var proposed = prev + amount;
      var r = proposed;
      if (proposed > 0) r = 0;else if (proposed < -state.maxStartOffset) r = -state.maxStartOffset + 1;
      initialYs.push(r);
    }

    // create frames
    var frames = [];
    var maxYTravel = -Math.min.apply(Math, initialYs) + state.inputCvs.height;
    var frameCount = Math.ceil(maxYTravel / state.verticalInc);
    for (var _i2 = 0; _i2 <= frameCount; _i2++) {
      frames.push(createFrame(state.inputCvs, initialYs, state.verticalInc, slices, _i2));
    }

    return _extends({}, state, { frames: frames });
  }

  if (action.type === 'GIF_START') {
    return _extends({}, state, { renderingGif: true, gifPercent: 0, gif: null });
  }

  if (action.type === 'GIF_PROGRESS') {
    return _extends({}, state, { gifPercent: action.payload });
  }

  if (action.type === 'GIF_COMPLETED') {
    return _extends({}, state, { renderingGif: false, gif: action.payload });
  }

  return state;
}

// END STATE MANAGEMENT

// BEGIN RENDER RENDER RENDER

var _window$preact = window.preact,
    h = _window$preact.h,
    Component = _window$preact.Component;


var LabeledInput = function LabeledInput(_ref) {
  var labelText = _ref.labelText,
      value = _ref.value,
      onChange = _ref.onChange;

  var readVal = function readVal(e) {
    return onChange(e.target.value);
  };
  return h('label', null, [labelText, h('input', {
    type: 'text',
    value: value,
    onchange: readVal,
    onkeyup: readVal
  })]);
};

var RenderButton = function (_Component) {
  _inherits(RenderButton, _Component);

  function RenderButton() {
    _classCallCheck(this, RenderButton);

    return _possibleConstructorReturn(this, (RenderButton.__proto__ || Object.getPrototypeOf(RenderButton)).apply(this, arguments));
  }

  _createClass(RenderButton, [{
    key: 'makeGif',
    value: function makeGif(_ref2) {
      var dispatch = _ref2.dispatch,
          frames = _ref2.app.frames;

      var gif = new window.GIF({
        workerScript: 'gif/gif.worker.js',
        workers: 2,
        quality: 10
      });

      AppState.frames.forEach(function (frame) {
        gif.addFrame(frame, { delay: 16 });
      });

      gif.on('progress', function (percent) {
        console.log('progress', percent);
        dispatch({ type: 'GIF_PROGRESS', payload: percent });
      });

      gif.on('finished', function (blob) {

        // window.open(URL.createObjectURL(blob));
        blobToImage(blob, function (err, img) {
          // const dest = document.querySelector('#melter-render-output');
          // dest.appendChild(img);
          dispatch({ type: 'GIF_COMPLETED', payload: img });
        });
      });

      gif.render();
    }
  }, {
    key: 'render',
    value: function render(props) {
      var _this2 = this;

      var dispatch = props.dispatch,
          _props$app = props.app,
          renderingGif = _props$app.renderingGif,
          gifPercent = _props$app.gifPercent;


      var value = renderingGif === true ? 'RENDERING ' + (gifPercent * 100).toFixed(2) + '%' : "Render";

      return h('input', {
        type: 'button',
        value: value,
        disabled: renderingGif ? 'disabled' : null,
        onclick: function onclick() {
          if (renderingGif) return;

          dispatch({ type: 'GIF_START' });

          // ensure we get at least a tick to update UI before RENDER_FRAMES
          // locks up...
          setTimeout(function () {
            dispatch({ type: 'RENDER_FRAMES' });
            _this2.makeGif(props);
          }, 100);
        }
      });
    }
  }]);

  return RenderButton;
}(Component);

var ImgHolder = function (_Component2) {
  _inherits(ImgHolder, _Component2);

  function ImgHolder() {
    _classCallCheck(this, ImgHolder);

    return _possibleConstructorReturn(this, (ImgHolder.__proto__ || Object.getPrototypeOf(ImgHolder)).apply(this, arguments));
  }

  _createClass(ImgHolder, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate() {
      return false;
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (!this.props.img) {
        this.base.innerHTML = '';
      }

      if (nextProps.img) {
        this.base.appendChild(nextProps.img);
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      // now mounted, can freely modify the DOM:

    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      // component is about to be removed from the DOM, perform any cleanup.
    }
  }, {
    key: 'render',
    value: function render() {
      return h('div', null, '');
    }
  }]);

  return ImgHolder;
}(Component);

var InputPanel = function (_Component3) {
  _inherits(InputPanel, _Component3);

  function InputPanel() {
    _classCallCheck(this, InputPanel);

    return _possibleConstructorReturn(this, (InputPanel.__proto__ || Object.getPrototypeOf(InputPanel)).apply(this, arguments));
  }

  _createClass(InputPanel, [{
    key: 'render',
    value: function render(props) {
      var dispatch = props.dispatch,
          _props$app2 = props.app,
          numSlices = _props$app2.numSlices,
          verticalInc = _props$app2.verticalInc,
          maxStartOffset = _props$app2.maxStartOffset,
          gif = _props$app2.gif;

      return h('form', null, [h('input', {
        type: 'file',
        onchange: function onchange(e) {
          fileToImage(e.target.files[0], function (err, img) {
            imageToCanvas(img, function (err, cvs) {
              dispatch({ type: 'IMAGE_LOAD', payload: cvs });
            });
          });
        }
      }), LabeledInput({
        labelText: 'Vertical Slices',
        value: numSlices,
        onChange: function onChange(value) {
          return dispatch({
            type: 'SLICE_COUNT_CHANGE',
            payload: parseInt(value, 10)
          });
        }
      }), LabeledInput({
        labelText: 'Vertical Increment',
        value: verticalInc,
        onChange: function onChange(value) {
          return dispatch({
            type: 'VERTICAL_INC_CHANGE',
            payload: parseInt(value, 10)
          });
        }
      }), LabeledInput({
        labelText: 'Maximum Start Offset',
        value: maxStartOffset,
        onChange: function onChange(value) {
          return dispatch({
            type: 'MAX_START_OFFSET_CHANGE',
            payload: parseInt(value, 10)
          });
        }
      }), h(RenderButton, props)]);
    }
  }]);

  return InputPanel;
}(Component);

var AppContainer = function AppContainer(props) {
  return h('div', null, [h(InputPanel, props), h(ImgHolder, { img: props.app.gif })]);
};

// END RENDER RENDER RENDER


// BEGIN APP BOOT PROCESS
var AppState = void 0;
function dispatch(action) {
  var curr = AppState;
  AppState = reduceState(action, curr);
  console.log('next state', AppState);

  if (curr === AppState) return;

  render();
}

var DomRoot = document.querySelector('#preact-root');
var AppDom = void 0;
function render() {
  var app = h(AppContainer, { app: AppState, dispatch: dispatch });
  AppDom = window.preact.render(app, DomRoot, AppDom);
}

// Make sure we have a good initial state.
dispatch({ type: '@@BOOT@@' });

render();

/***/ })
/******/ ]);
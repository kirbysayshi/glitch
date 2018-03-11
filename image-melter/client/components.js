// BEGIN RENDER RENDER RENDER

import { h, Component, } from 'preact';
import { default as FileSaver } from 'file-saver';
import { fileToRotatedCanvas } from './orient-cvs';
import { computePercentComplete, createFrames } from './state';

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
    
      
      h(RenderButton, props),
    ]);
  }
}

export const AppContainer = (props) => {
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
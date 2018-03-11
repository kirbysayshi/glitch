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
  background-color: transparent;
  color: inherit;
`;

const DOSButton = DOSLabel.withComponent('button');

const DOSTextInput = styled.input`
  padding: 0;
  width: 20%;
  float: right;
  text-align: right;
  border: 0;
  color: inherit;
  background-color: transparent;
`;

const CHAR_WIDTH_EMS = '1.15em';

// https://en.wikipedia.org/wiki/Video_Graphics_Array#Color_palette
const VGA_BLACK = '#000000';
const VGA_BLUE = '#0000aa';
const VGA_GREEN = '#00aa00';
const VGA_CYAN = '#00aaaa';
const VGA_RED = '#aa0000';
const VGA_MAGENTA = '#aa00aa';
const VGA_BROWN = '#aa5500';
const VGA_GRAY = '#aaaaaa';
const VGA_DARK_GRAY = '#555555';
const VGA_BRIGHT_BLUE = '#5555ff';
const VGA_BRIGHT_GREEN = '#55ff55';
const VGA_BRIGHT_CYAN = '#55ffff';
const VGA_BRIGHT_RED = '#ff5555';
const VGA_BRIGHT_MAGENTA = '#ff55ff';
const VGA_YELLOW = '#ffff55';
const VGA_WHITE = '#ffffff';

const DOSBox = styled.div`
  padding: ${CHAR_WIDTH_EMS};
  background-color: ${props => props.bgcolor};
  display: block;
  position: relative;
  border: 0.12em solid white;
  margin: ${CHAR_WIDTH_EMS};
  color: ${props => props.txtcolor};

  &::after {
    position: absolute;
    content: '';
    background-color: ${props => props.bgcolor};
    top: -${CHAR_WIDTH_EMS}; /* Must match margin */
    right: -${CHAR_WIDTH_EMS};
    bottom: -${CHAR_WIDTH_EMS};
    left: -${CHAR_WIDTH_EMS};
    z-index: -1;
  }
`;

const DOSFormBox = DOSBox.withComponent('form');
const DOSH1Box = DOSBox.withComponent('h1');

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
    return h(DOSFormBox, { bgcolor: VGA_BRIGHT_MAGENTA, txtcolor: VGA_WHITE }, [
      
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

const RootContainer = styled.div`
  padding: ${CHAR_WIDTH_EMS};
  font-family: 'Less Perfect DOS VGA';
  background-color: ${VGA_BLUE};
  color: ${VGA_WHITE};
  z-index: -1;
`;

export const AppContainer = (props) => {
  
  const cvurl = 'https://www.youtube.com/watch?v=4Xe6leSt_dU';
  const smurl = 'http://doom.wikia.com/wiki/Screen_melt';
  
  return (
    <RootContainer>
      <header>
        <DOSH1Box bgcolor={VGA_BRIGHT_RED} txtcolor={VGA_YELLOW}>
          Welcome to the Most Advanced Special Effect™ of 1993 
        </DOSH1Box>
      </header>

      <main>
        <p>DOOM and {' '}
          <a href={cvurl}>Castlevania: Symphony of the Night</a>{' '}
          both used a very specific transition effect: the{' '}
          <a href={smurl}>screen melt</a> or screen wipe.
        </p>
        <p>
          Now, you too can wield this powerful effect!
        </p>
        <div>
          {props.app.errors.map(err => <div>err.message</div>)}
          <InputPanel {...props} />
          <ElHolder el={props.app.gif} />
          {
            props.app.gifBlob
            && <a
              href='#'
              download='melted.gif'
              onclick={e => {
                e.preventDefault();
                e.stopPropagation();
                FileSaver.saveAs(props.app.gifBlob, 'melted.gif');
              }}
            >Download Image</a>
          }
        </div>
      </main>

      <footer>
        <p>
          <a href="https://glitch.com">Remix this in Glitch</a>
        </p>

        <dl>
          <dt>Interface Inspiration</dt>
          <dd>https://www.vogons.org/viewtopic.php?t=16974</dd>
          <dd>https://archive.org/details/CommanderKeen6AliensAteMyBabySitter</dd>
          <dd>https://github.com/davemandy/sneakers-effect</dd>
          <dd>https://github.com/kristopolous/BOOTSTRA.386/wiki/Gallery</dd>

          <dt>Learning Resources</dt>
          <dd>https://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/</dd>

          <dt>Technologies/Libraries Used</dt>
          <dd>https://preactjs.com/</dd>
          <dd>http://rollupjs.org/</dd>
          <dd>https://www.styled-components.com</dd>

          <dt>Assets</dt>
          <dd><a href="http://laemeur.sdf.org/fonts/">"Less Perfect DOS VGA" font via LAEMEUR</a></dd>
        </dl>
      </footer>
    </RootContainer>
  )
}

// END RENDER RENDER RENDER
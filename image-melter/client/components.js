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

import styled, { css } from 'styled-components';

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

const CHAR_LENGTH_EMS = '1.15em';

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

const DOSBoxMaker = (tag) => styled(({ className, children, ...props }) => {
  return (
    <div className={className}>
      {h(tag, null, children)}
    </div>
  )
})`
  position: relative;
  z-index: 0;
  overflow: hidden;

  & > * {
    padding: ${CHAR_LENGTH_EMS};
    background-color: ${props => props.bgcolor};
    display: block;
    position: relative;
    border: 0.12em solid white;
    margin: ${CHAR_LENGTH_EMS};
    color: ${props => props.txtcolor};
    text-align: ${props => props.align || 'inherit'}
  }

  & > *::after {
    position: absolute;
    content: '';
    background-color: ${props => props.bgcolor};
    top: -${CHAR_LENGTH_EMS}; /* Must match margin */
    right: -${CHAR_LENGTH_EMS};
    bottom: -${CHAR_LENGTH_EMS};
    left: -${CHAR_LENGTH_EMS};
    z-index: -1;
  }
`;

const DOSFormBox = DOSBoxMaker('form');
const DOSH1Box = DOSBoxMaker('h1');
const DOSDivBox = DOSBoxMaker('div');


// TODO: drag n drop is now broken by hiding the input! How to fix???
const DOSImageInputButton2 = styled(class extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      fileName: null,
    };
  }
  
  render() {
    const { className, text, onFile } = this.props;
    const { fileName } = this.state;
    return (
      <DOSLabel className={className}>
        { text }
        <DOSFileInput
          type='file'
          accept='image/*'
          onChange={e => {
            const file = e.target.files[0];
            this.setState({ fileName: file.name });
            onFile(file);
          }}
        />
        {
          fileName &&
          <span style={{ float: 'right' }}>{fileName}</span>
        }
      </DOSLabel>
    )
  }
})`
  &:hover {
    cursor: pointer;
  }
`;

const DOSPlainTextBox = styled.div`
  overflow: hidden;
`;

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
      
      <DOSImageInputButton2
        text='Choose Background Image'
        onFile={file => {
          fileToRotatedCanvas(file, (err, cvs) => {
            if (err) return dispatch({ error: err });
            dispatch({ type: 'IMAGE_LOAD', payload: { cvs, layer: 'background', }});
          });
        }}
      />,
      
      <DOSImageInputButton2
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

class FooterContent extends Component {
  
  constructor (props) {
    super(props);
    this.state = { collapsed: true }
  }
  
  render () {
    
    if (this.state.collapsed) {
      return (
        <footer>
          <p>
            <a href="#" onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              this.setState({ collapsed: false });
            }}>How does this work?</a>
          </p>
        </footer>
      )  
    }
    
    const glitchUrl = 'https://glitch.com/edit/#!/remix/image-melter';
    
    return (
      <footer>
        <p>This effect is somewhat difficult to achieve today. When DOOM was released in 1993, the common supported resolution was 320x200 pixels. The engine itself manipulated each pixel on the screen. But today, we rely on GPUs to composite graphics at the polygon and texture levels: there are too many pixels on the screen to compute each on the CPU sequentially! While this effect can be accomplished in WebGL, you probably can't save it and share it with your friends! Thus, wait a minute and render to a technology almost as old as DOOM itself: the animated GIF.</p>
      
        <p>While my implementation is somewhat different, the basic idea is explained in this excellent article from 2014: <a href='https://davidwalsh.name/canvas-effect'>Replicating the DOOM Screen Melt with JavaScript and Canvas</a>. I didn't actually know about that article when I started, instead relying on the DOOM source code to understand the effect. I also tweaked the algorithm a bit to accomodate today's large images.</p>
        
        <p>Each frame of the animation is copied to a canvas, which is then passed into a Gif encoder running in a Web Worker. The first 50% of progress is the frame computation, while the second 50% is the Gif encoder creating the actual animated Gif. Note: rendering takes a while, but only because of Gif optimization. If the animation were rendered in realtime it would actually take much less time! But then you wouldn't be able to save it.</p>
      
        <p>
          Made by Drew Petersen. <a href='https://twitter.com/kirbysayshi'>Twitter</a>. <a href='https://github.com/kirbysayshi'>Github</a>. <a href={glitchUrl}>Remix this in Glitch!</a>
        </p>

        <dl>
          <dt>Interface Inspiration</dt>
          {[
            'https://www.vogons.org/viewtopic.php?t=16974',
            'https://archive.org/details/CommanderKeen6AliensAteMyBabySitter',
            'https://github.com/davemandy/sneakers-effect',
            'https://github.com/kristopolous/BOOTSTRA.386/wiki/Gallery',
          ].map(link => <dd><a href={link}>{link}</a></dd>)}

          <dt>Learning Resources</dt>
          {[
            'https://en.wikipedia.org/wiki/VGA-compatible_text_mode',
            'https://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/',
          ].map(link => <dd><a href={link}>{link}</a></dd>)}

          <dt>Technologies/Libraries Used</dt>
          <dd><a href={glitchUrl}>Check out this code in Glitch to see the package.json</a></dd>

          <dt>Assets</dt>
          <dd><a href="http://laemeur.sdf.org/fonts/">"Less Perfect DOS VGA" font via LAEMEUR</a></dd>
        </dl>
      </footer>
    )
  }
}

const RootContainer = styled.div`
  min-height: 100vh;
  padding: ${CHAR_LENGTH_EMS};
  font-family: 'Less Perfect DOS VGA';
  background-color: ${VGA_BLUE};
  color: ${VGA_WHITE};
  z-index: -1;
`;

export const AppContainer = (props) => {
  
  const cvurl = 'https://youtu.be/4Xe6leSt_dU?t=8';
  const smurl = 'http://doom.wikia.com/wiki/Screen_melt';
  
  return (
    <RootContainer>
      <header>
        <DOSH1Box
          bgcolor={VGA_BRIGHT_RED}
          txtcolor={VGA_YELLOW}
          align='center'
        >
          Welcome to the Most Advanced Special Effect™ of 1993 
        </DOSH1Box>
      </header>

      <main>
        <DOSPlainTextBox>
          <p><a href={smurl}>DOOM</a> and {' '}
            <a href={cvurl}>Castlevania: Symphony of the Night</a>{' '}
            both used a very specific transition effect: the{' '}
            <a href={smurl}>screen melt</a> or screen wipe.
          </p>
          <p>
            Now, you too can wield this powerful effect!
          </p>
        </DOSPlainTextBox>
        <div>
          {props.app.errors.map(err =>
            <DOSDivBox
              bgcolor={VGA_RED}
              txtcolor={VGA_YELLOW}
              align='center'
            >{err.message}</DOSDivBox>
          )}
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

      <FooterContent />
    </RootContainer>
  )
}

// END RENDER RENDER RENDER
const RoomList = [
  {
    id: 'VOID',
    name: 'The Starting Void',
    cards: [
      {
        back: 'Welcome to a story.',
      },
      {
        back: 'Soon you will be transported and trapped. You should try to escape.',
      },
      {
        back: 'Text in [BRACKETS] can be used as the target of an action.',
      },
      {
        back: 'When you\'re ready, type in the box: LOCATION FOYER',
      }
    ],
    onEnter: function (game) {
      console.log('onenter void!', game);
    }
  },
  {
    // TODO: should this list just be a named object?
    // RoomList = { 'Foyer': { ... } etc
    id: 'FOYER',
    name: 'Foyer',
    cards: [
      {
        back: `You are in a splendid foyer of what appears to be an old mansion. Behind you is a door so solid that even throwing your entire weight against it causes no perceptible give.`,
        onEnter: (game) => {}
      },
      {
        id: 'STATUE',
        back: 'A statue, maybe',
        front: 'You approach the statue and immediately stagger backwards. It\'s in your image! What could it mean?',
        // TODO: make this a fight?
      },
      {
        id: 'DOOR',
        back: 'A huge door',
        front: 'The door is immense, and so solid that even trying to rack your knuckles on the wood (is it even wood?) creates little sound.',
        onLook: (game) => {
          // TODO: if user has the MANSION_KEY, trigger win condition!  
        }
      }
    ],
    onEnter: function (game) {
      // TODO: does this function just yield ACTION() as many times as it wants?
      console.log('onenter foyer!', game);
    }
  },
  {
    id: 'STUDY',
    name: 'Study',
    cards: [
      {
        back: 'The study is austere, with lots of leathery objects and tables.',
      },
      {
        id: 'DESK',
        back: 'A massive wooden desk',
        front: 'Within the drawers of the desk you find an old key!',
        onLook: (game) => {
          // show item OLD_KEY
          // OLD_KEY has a note attached: 'They always say "Do not write your passwords down". But what if you forget where they lead? This is the ballroom key, in case I forget'
        }
      }
    ],
    onEnter: function (game) {
      console.log('onenter study!', game);
    }
  }
]

const ItemDeck = [
  {
    // TODO: is id the same as "anonymous name" e.g. Item 1? Or should there be an anonymous name too?
    id: 'item-00',
    name: 'Letter',
    description: '',
    requirements: function (game) { return true; },
    onDisplay: function (game) {
      // when the card is shown?  
    }
  }
]

let INITIAL_STATE = {
  roomId: 'VOID',
  cardId: null,
  locationState: {
    flippedCards: {},
  },
  timeUnits: 0,
  messages: [],
};

let state = undefined;

function dispatch (action) {
  const prevState = state;
  const nextState = reduce(action, state);
  if (prevState !== nextState) {
    render(scrollArea, nextState);  
  }
  state = nextState;
}

function reduce (action, state=INITIAL_STATE) {
  
  if (action.type === 'TEXT_INPUT') {
    const cmd = parseTextInput(action.payload);
    
    if (!cmd) {
      // what to do?????
      // chan.put() ??
      return {
        ...state,
        messages: [
          ...state.messages,
          'Unknown Command!',
        ]
      };
    }
    
    if (cmd.type === 'LOOK') {
      const room = RoomList.find(r => r.id === state.roomId);
      const cards = room.cards.slice(1);
      const card = cards.find(c => c.id === cmd.dest);
      if (!card) {
        return {
          ...state,
          messages: [
            ...state.messages,
            'That is not a card in this room!',
          ]
        };  
      }
      
      return {
        ...state,
        cardId: card.id,
        locationState: {
          ...state.locationState,
          flippedCards: {
            [card.id]: true,
          }
        }
      }
    }

    if (cmd.type === 'CHANGE_LOCATION') {
      const dest = RoomList.find(r => r.id === cmd.dest);
      if (!dest) {
        return {
          ...state,
          messages: [
            ...state.messages,
            'Unknown Location!',
          ]
        };
      }
      
      // check if the user can do this... how??
      // decrement time
      // switch state
      return {
        ...state,
        timeUnits: state.timeUnits + (Math.floor(Math.random() * 255) % 3),
        roomId: dest.id,
        locationState: {},
      }
    }
  }
  
  return state;
}

function parseTextInput (value) {
  const [textCmd, ...parts] = value.split(' ');
  
  switch (textCmd.toUpperCase()) {
    case 'LOCATION': return {
      type: 'CHANGE_LOCATION',
      dest: parts[0],
    }
      
    case 'LOOK': return {
      type: 'LOOK',
      dest: parts[0],
    }
  }
}

function render (root, state) {
  const room = RoomList.find(r => r.id === state.roomId);
  
  const { cards } = room;
  const currentCard = cards.find(c => c.id === state.cardId);
  const { flippedCards = {} } = state.locationState;
  
  const crender = card => card ? `
        ${card.id ? `[${card.id}]` : ''}
        ${flippedCards[card.id] ? '> ' + card.front : card.back}
  `: '';
  
  const locationList = () => {
    const isVoid = room.id === 'VOID';
    
    const pairs = RoomList.slice(1).map(r => `
        ${r.name} [${r.id}]
      `).join('');
    
    return isVoid ? '' : `
      Locations:
        ${pairs}
    `
  }
  
  const cardList = () => {
    return cards.map(c => crender(c)).join('');
  }
  
  const d = document.createElement('div');
  d.innerHTML = `
    <pre>
      ${locationList(room)}
      Current Location: ${room.name} [${room.id}]
      Location Cards:
        ${cardList()}
      Elapsed Time: ${state.timeUnits}
      ${state.messages.slice(-5).map(m => { return `
        ${m}`
      }).join('')}
    </pre>
  `
  
  root.appendChild(d);
  
  requestAnimationFrame(() => {
    window.scrollTo(0, document.body.clientHeight);
  });
}

const scrollArea = document.createElement('div');
document.body.appendChild(scrollArea);

const input = document.createElement('input');
input.style.textTransform = 'uppercase';
input.type = 'text';
input.onkeydown = e => {
  if (e.key === 'Enter') {
    const value = e.target.value.toUpperCase();
    e.target.value = '';
    dispatch({ type: 'TEXT_INPUT', payload: value });
  }
}

const statusArea = document.createElement('div');
// statusArea.style.width = '100vw';
// statusArea.style.height = '10vh';
// statusArea.style.position = 'fixed';
statusArea.appendChild(input);

document.body.appendChild(statusArea);

dispatch({ type: 'BOOOOOOOOOOT' });


/*

// the super game state loop
take a player input
if its valid, do it!

if we enter a location, show the first card

if we look at a card, show the card front

if the card front has a side effect, do it!
 -> show an item
 -> add a location
 -> trigger a fight
 -> lock the player until resolved



*/
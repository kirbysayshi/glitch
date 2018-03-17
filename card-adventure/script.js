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
        back: `You are in a splendid foyer of what appears to be an old mansion.
              Behind you is a door so solid that even throwing your entire weight
              against it causes no perceptible give.`,
        onEnter: (game) => {}
      },
      {
        id: 'STATUE',
        back: 'A statue, maybe',
      },
      {
        id: 'DOOR',
        back: 'A huge door'
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
    cards: [],
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

let state = {
  roomId: 'VOID',
  cardId: null,
  locationState: {
    flippedCards: {},
  },
  timeUnits: 30,
  messages: [],
};

function dispatch (action) {
  
  const prevState = state;
  
  if (action.type === 'TEXT_INPUT') {
    const cmd = parseTextInput(action.payload);
    
    if (!cmd) {
      // what to do?????
      // chan.put() ??
      state = {
        ...state,
        messages: [
          ...state.messages,
          'Unknown Command!',
        ]
      };
      return;
    }
    
    if (cmd.type === 'LOOK') {
      // ??  
    }

    if (cmd.type === 'CHANGE_LOCATION') {
      const dest = RoomList.find(r => r.id === cmd.dest);
      if (!dest) {
        state = {
          ...state,
          messages: [
            ...state.messages,
            'Unknown Location!',
          ]
        };
        return;
      }
      
      // check if the user can do this... how??
      // decrement time
      // switch state
      state = {
        ...state,
        timeUnits: state.timeUnits - ((Math.random() * 255) % 3),
        roomId: dest.id,
        locationState: {},
      }
      return;
    }
  }
  
  if (prevState !== state) {
    render(scrollArea, state);  
  }
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
        [${card.id}]
        ${flippedCards[card.id] ? card.back : card.front}
  `: '';
  
  const d = document.createElement('div');
  d.innerHTML = `
    <pre>
      Location: ${room.name} [${room.id}]
      Cards:
        ${crender(cards[0])}
        ${crender(cards[1])}
        ${crender(cards[2])}
        ${crender(cards[3])}
        ${crender(cards[4])}
        ${crender(cards[5])}
        ${crender(cards[6])}
        ${crender(cards[7])}
        ${crender(cards[8])}
        ${crender(cards[9])}
    </pre>
  `
  
  root.appendChild(d);
}

const scrollArea = document.createElement('div');
document.body.appendChild(scrollArea);

const input = document.createElement('input');
input.type = 'text';
input.onkeydown = e => {
  if (e.key === 'Enter') {
    const { value } = e.target;
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

render(scrollArea, state);
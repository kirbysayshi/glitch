const RoomList = [
  {
    // TODO: should this list just be a named object?
    // RoomList = { 'Foyer': { ... } etc
    id: 'foyer',
    name: 'Foyer',
    cards: [
      {
        desc: 'A ',
        onEnter: (game) => {}
      }
    ],
    onEnter: function (game) {
      // TODO: does this function just yield ACTION() as many times as it wants?
      console.log('onenter foyer!', game);
    }
  },
  {
    id: 'study',
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
  roomId: 'foyer',
  timeUnits: 30,
};
function CentralDispatch (action) {
  
  if (action.type === 'TEXT_INPUT') {
  
    return Object.assign({}, state, {
      
    })
  }
  
  return state;
}

function parseTextInput (value) {
  const [textCmd, ...parts] = value.split(' ');
  
  switch (textCmd.toLowerCase()) {
    case 'location': return {
      type: 'CHANGE_LOCATION',
      destination: '',
    }
      
    case 'move': return {
      type: 'MOVE',
      destination: '',
    }
  }
}


const scrollArea = document.createElement('div');
document.body.appendChild(scrollArea);

const input = document.createElement('input');
input.type = 'text';
input.onkeydown = e => {
  if (e.key === 'Enter') {
    const { value } = e.target;
    e.target.value = '';
  }
}

const statusArea = document.createElement('div');
// statusArea.style.width = '100vw';
// statusArea.style.height = '10vh';
// statusArea.style.position = 'fixed';
statusArea.appendChild(input);

document.body.appendChild(statusArea);
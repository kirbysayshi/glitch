const RoomList = [
  {
    // TODO: should this list just be a named object?
    // RoomList = { 'Foyer': { ... } etc
    id: 'foyer',
    name: 'Foyer',
    onEnter: function (game) {
      console.log('onenter foyer!', game);
    }
  },
  {
    id: 'study',
    name: 'Study',
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

const scrollArea = document.createElement('div');
document.body.appendChild(scrollArea);

const input = document.createElement('input');
input.type = 'text';
input.onkeydown = e => {
  if (e.key === 'Enter') {
    console.log('ENTER!');  
  }
}

const statusArea = document.createElement('div');
statusArea.style.width = '100vw';
statusArea.style.width = '100vw';
statusArea.appendChild(input);

document.body.appendChild(statusArea);
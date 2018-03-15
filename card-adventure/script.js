const RoomList = [
  {
    // TODO: should this list just be a named object?
    // RoomList = { 'Foyer': { ... } etc
    id: 'foyer',
    name: 'Foyer',
    onEnter: function (game) {
      console.log('onenter foyer!', game);
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
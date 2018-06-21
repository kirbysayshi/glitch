// client-side js
// run by the browser each time your view template referencing it is loaded

(function(){
  console.log('hello world :o');
  
  const aloneRoot = document.querySelector('#alone-root');
  
  // a helper function to call when our request for dreams is done
  const getDreamsListener = function() {
    // parse our response to convert to JSON
    dreams = JSON.parse(this.responseText);
    
    // iterate through every dream and add it to our page
    dreams.forEach( function(row) {
      appendNewDream(row.dream);
    });
  }
  
  // request the dreams from our app's sqlite database
  const aloneReq = new XMLHttpRequest();
  aloneReq.onload = function () {
    let payload;
    try {
      payload = JSON.parse(this.responseText);
    } catch (e) {
      
    }
  }
  aloneReq.open('get', '/getDreams');
  aloneReq.send();
  
  function formatAsHTML (err, data) {
    const 
    if (err) {
      
      return 
    }
  }
  
})()
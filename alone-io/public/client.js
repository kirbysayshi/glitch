// client-side js
// run by the browser each time your view template referencing it is loaded

(function(){
  console.log('hello world :o');
  
  const aloneRoot = document.querySelector('#alone-root');
  
  const aloneReq = new XMLHttpRequest();
  aloneReq.onload = function () {
    let payload;
    let el;
    try {
      payload = JSON.parse(this.responseText);
      el = formatAsHTML(null, payload);
    } catch (e) {
      el = formatAsHTML(e);
    }
    
    aloneRoot.innerHTML = '';
    aloneRoot.appendChild(el);
  }
  aloneReq.open('get', '/alone');
  aloneReq.send();
  
  function formatAsHTML (err, data) {
    const el = document.createElement('div');
    if (err) {
      el.textContent = err.message;
      return el;
    }
    
    if (!data.alone) {
      el.innerHTML = '<h2>YOU ARE NOT ALONE.</h2><p>The last signal was received at ' + data.lastTime + '.</p>';  
    } else {
      el.innerHTML = '<h2>YOU ARE ALONE.</h2><p>The last signal was received at ' + data.lastTime + '.</p>';  
    }
    
    return el;
  }
})()
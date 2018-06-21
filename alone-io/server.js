// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// init sqlite db
var fs = require('fs');
var dbFile = './.data/sqlite.db';
var exists = fs.existsSync(dbFile);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  if (!exists) {
    db.run('CREATE TABLE Alone (lastUpdate INT)');
    console.log('New table Alone created!');
    
    // insert default dreams
    db.serialize(function() {
      db.run('INSERT INTO Alone (lastUpdate) VALUES (strftime(\'%s\',\'now\'))');
    });
  }
  else {
    console.log('Database "Alone" ready to go!!');
    db.each('SELECT * from Alone', function(err, row) {
      if ( row ) {
        console.log('record:', row);
      }
    });
  }
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/alone', function(request, response) {
  db.all('SELECT lastUpdate from Alone', function(err, rows) {
    console.log('row?', rows);
    if (err) {
      response.send(JSON.stringify({ error: err }));
      return;
    }
    
    const lastUpdate = rows[0].lastUpdate;
    const lastUpdateMS = lastUpdate * 1000;
    const nowMS = Date.now();

    // 1 hour, for now.
    const alone = nowMS - lastUpdateMS > 3600 * 1000;
    
    response.send(JSON.stringify({
      alone,
      lastUpdateMS,
    }));
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);

// Import game logic.
const hex = require("./common.js");

// CONNECTION WITH CLIENTS /////////////////////////////////////////////////////

// Connected clients.
let clients = [];

// Next available user identifier.
let clientId = 0;

// Retrieve a socket based on the id.
let getClient = function(
    id) { return clients.find((s) => { return s.clientId == id; }); };

// Handler for incoming connections.
io.on("connection", (socket) => {
  // To each connected client we assign an integer identifier.
  socket.clientId = clientId;

  // Set the status to lobby, meaning the client is waiting for someone to
  // connect to its game.
  socket.status = "lobby";

  // Send the id to the client, so that he knows his join link.
  socket.emit("id", socket.clientId);

  // Handler for disconnection.
  socket.on("disconnect", (reason) => {
    // Remove client from the array.
    clients = clients.filter((s) => { return s !== socket; });

    // Search through existing games to tell the other player that this one
    // disconnected.
    let i = 0;
    for (; i < games.length; ++i) {
      let otherClient = undefined;
      if (games[i][0].clientId == socket.clientId)
        otherClient = games[i][1];
      else if (games[i][1].clientId == socket.clientId)
        otherClient = games[i][0];

      if (otherClient)
        otherClient.emit("gameOver", {reason : "opponent left"});

      break;
    }

    // Remove the finished game.
    if (i < games.length) {
      console.log("[game-" + games[i][2].gameId +
                  "  ] ending due to player disconnection.");
      games.splice(i, 1);
    }

    console.log("[client-" + socket.clientId + "] disconnected (" + reason +
                ").");
  });

  // Handler for join game events.
  socket.on("join", (id) => {
    let other_player = getClient(id);

    console.log("[client-" + socket.clientId + "] request to join client-" +
                id + "...");

    // If there's no such player, or you're trying to join yourself, send back a
    // failed to join event.
    if (!other_player || id == socket.clientId) {
      console.log("[client-" + socket.clientId + "] rejected: invalid id.");
      socket.emit("failedToJoin", {reason : "invalid id"});
    }

    // If the other player is busy, send back a failed to join event.
    else if (other_player.status != "lobby") {
      console.log("[client-" + socket.clientId + "] rejected: client-" + id +
                  " is busy.");
      socket.emit("failedToJoin", {reason : "other player is busy"});
    }

    // Otherwise, start a game between the two players.
    else {
      console.log("[client-" + socket.clientId +
                  "] request granted, starting game...");
      startGame(other_player, socket);
    }
  });

  // Add to the array of connected clients.
  clients.push(socket);

  // Grab a new user identifier.
  ++clientId;

  console.log("[client-" + socket.clientId +
              "] connected and waiting in the lobby.");
});

// GAME LOGIC //////////////////////////////////////////////////////////////////

// Array of games. Each entry is made of player1, player2, game state.
let games = [];

// Next available game identifier.
let gameId = 0;

// Start a new game between two players.
let startGame = function(player1, player2) {
  let game = new hex.Game(10);
  game.gameId = gameId;

  games.push([ player1, player2, game ]);

  player1.status = "game";
  player2.status = "game";

  // Tell each player which side they are.
  player1.emit("playerSide", 1);
  player2.emit("playerSide", 2);

  // Send to each player the current state.
  player1.emit("gameState", game);
  player2.emit("gameState", game);

  // Be ready to receive moves from the players: if the move is valid, we apply
  // it, then transmit again the state to both clients.
  player1.on("move", (move) => {
    if (game.turn == 1 && game.move(move.i, move.j)) {
      if (game.finished)
        console.log("[game-" + game.gameId + "  ] finished! player 1 wins.");

      player1.emit("gameState", game);
      player2.emit("gameState", game);
    }
  });
  player2.on("move", (move) => {
    if (game.turn == 2 && game.move(move.i, move.j)) {
      if (game.finished)
        console.log("[game-" + game.gameId + "  ] finished! player 2 wins.");

      player1.emit("gameState", game);
      player2.emit("gameState", game);
    }
  });

  console.log("[game-" + game.gameId + "  ] started between client-" +
              player1.clientId + " and client-" + player2.clientId + ".");

  // Grab a new game identifier.
  ++gameId;
};

// HTTP SERVER /////////////////////////////////////////////////////////////////

// Send files as requested.
app.get("/", (req, res) => { res.sendFile(__dirname + "/index.html"); });
app.get("/client.js",
        (req, res) => { res.sendFile(__dirname + "/client.js"); });
app.get("/common.js",
        (req, res) => { res.sendFile(__dirname + "/common.js"); });
app.get("/style.css",
        (req, res) => { res.sendFile(__dirname + "/style.css"); });

// Start the HTTP server.
http.listen(3000, () => { console.log("[server  ] listening on *:3000"); });

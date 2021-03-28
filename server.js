const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);

// Import game logic.
const hex = require("./common.js");

// UTILITIES ///////////////////////////////////////////////////////////////////

// Alphabet from which the characters in the ids are drawn.
const id_alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

// Number of characters for ids.
const id_length = 6;

// Retrieve an entry in an array based on its id.
let findId =
    (array, id) => { return array.find((s) => { return s.id == id; }); };

let newId = function(array) {
  let id = "";

  do {
    id = "";
    for (let i = 0; i < id_length; ++i)
      id += id_alphabet.charAt(Math.floor(Math.random() * id_alphabet.length));

  } while (findId(array, id) != undefined);

  return id;
};

// CONNECTION WITH CLIENTS /////////////////////////////////////////////////////

// Connected clients.
let clients = [];

// Handler for incoming connections.
io.on("connection", (socket) => {
  // To each connected client we assign an integer identifier.
  socket.id = newId(clients);

  // Set the status to lobby, meaning the client is waiting for someone to
  // connect to its game.
  socket.status = "lobby";

  // Send the id to the client, so that he knows his join link.
  socket.emit("id", socket.id);

  // Handler for disconnection.
  socket.on("disconnect", (reason) => {
    // Remove client from the array.
    clients = clients.filter((s) => { return s !== socket; });

    // Search through existing games to end any game the disconnecting client
    // might be playing.
    for (let i = 0; i < games.length; ++i)
      if (games[i][0].id == socket.id || games[i][1].id == socket.id) {
        endGame(games[i], "player disconnection");
        break;
      }

    console.log("[client-" + socket.id + "] disconnected (" + reason + ").");
  });

  // Handler for join game events.
  socket.on("join", (id) => {
    let other_player = findId(clients, id);

    console.log("[client-" + socket.id + "] request to join client-" + id +
                "...");

    // If there's no such player, or you're trying to join yourself, send back a
    // failed to join event.
    if (!other_player || id == socket.id) {
      console.log("[client-" + socket.id + "] rejected: invalid id.");
      socket.emit("failedToJoin", {reason : "invalid id"});
    }

    // If the other player is busy, send back a failed to join event.
    else if (other_player.status != "lobby") {
      console.log("[client-" + socket.id + "] rejected: client-" + id +
                  " is busy.");
      socket.emit("failedToJoin", {reason : "other player is busy"});
    }

    // Otherwise, start a game between the two players.
    else {
      console.log("[client-" + socket.id +
                  "] request granted, starting game...");
      startGame(other_player, socket);
    }
  });

  // Handler for players returning to the lobby.
  socket.on("lobby", () => {
    // Verify that the player doesn't have any ongoing games.
    for (let i = 0; i < games.length; ++i)
      if ((games[i][0].id == socket.id || games[i][1].id == socket.id) &&
          !games[i][2].finished)
        return;

    // If everything is fine, change the status of the client.
    socket.status = "lobby";
    console.log("[client-" + socket.id + "] returning to lobby.");
  });

  // Add to the array of connected clients.
  clients.push(socket);

  console.log("[client-" + socket.id + "] connected.");
});

// GAME LOGIC //////////////////////////////////////////////////////////////////

// Array of games. Each entry is made of player1 socket, player2 socket, game
// state object.
let games = [];

// Start a new game between two players.
let startGame = function(player1, player2) {
  let game = new hex.Game(13);
  let gameEntry = [ player1, player2, game ];
  game.id = newId(games);

  games.push(gameEntry);

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
      if (game.finished) {
        console.log("[  game-" + game.id + "] finished! player 1 wins.");
        endGame(gameEntry, "player 1 wins");
      }

      player1.emit("gameState", game);
      player2.emit("gameState", game);
    }
  });
  player2.on("move", (move) => {
    if (game.turn == 2 && game.move(move.i, move.j)) {
      if (game.finished) {
        console.log("[  game-" + game.id + "] finished! player 2 wins.");
        endGame(game, "player 2 wins");
      }

      player1.emit("gameState", game);
      player2.emit("gameState", game);
    }
  });

  console.log("[  game-" + game.id + "] started between client-" + player1.id +
              " and client-" + player2.id + ".");
};

// End a game before it's finished.
let endGame = function(game, reason) {
  game[2].turn = 0;

  game[0].emit("gameState", game[2]);
  game[0].emit("gameOver", reason);

  game[1].emit("gameState", game[2]);
  game[1].emit("gameOver", reason);

  // Remove the game from the array.
  games = games.filter((g) => { return g[2] !== game[2]; });

  console.log("[  game-" + game[2].id + "] ending due to " + reason);
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
let port = process.env.PORT || 3000;
http.listen(port,
            () => { console.log("[server-000000] listening on *:3000"); });

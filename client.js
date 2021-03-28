// BOARD RENDERING /////////////////////////////////////////////////////////////

// Precomputed constants.
const sqrt_3 = Math.sqrt(3);
const sqrt_3_halves = sqrt_3 / 2.0;

// Hex radius.
let hex_radius = 24;

// Maximum hex radius.
const max_hex_radius = 24;

// Hex margin.
let hex_margin = 2;

// Board offset.
let board_offset_x = hex_radius * sqrt_3_halves;
let board_offset_y = hex_radius * sqrt_3;

// Currently highlighted hex.
let highlighted_hex = {i : -1, j : -1};

// Colors.
const color_bg = "#FFFFFF";
const colors_board = [
  "#D0D0D0", // Empty tile.
  "#FF6000", // Player 1.
  "#0080FF"  // Player 2.
];

// Get canvas coordinates of a hexagon.
let hex_to_cnvs = function(i, j, radius, margin) {
  return {
    x : (sqrt_3 * (radius + margin)) * (j + 0.5 * i),
    y : (1.5 * (radius + margin)) * i
  };
};

// Get hex coordinates of a point on canvas.
let cnvs_to_hex = function(x, y, radius, margin) {
  let hex_i = y / (1.5 * (radius + margin));
  let hex_j = x / (sqrt_3 * (radius + margin)) - 0.5 * hex_i;

  return {i : Math.round(hex_i), j : Math.round(hex_j)};
};

// Draw an hexagon.
let draw_hex = function(ctxt, x, y, radius, color, stroke_color) {
  let x1 = Math.round(x + radius * sqrt_3_halves);
  let x2 = Math.round(x);
  let x3 = Math.round(x - radius * sqrt_3_halves);

  let y1 = Math.round(y - radius);
  let y2 = Math.round(y - radius * 0.5);
  let y3 = Math.round(y + radius * 0.5);
  let y4 = Math.round(y + radius);

  ctxt.beginPath();
  ctxt.moveTo(x2, y1);
  ctxt.lineTo(x1, y2);
  ctxt.lineTo(x1, y3);
  ctxt.lineTo(x2, y4);
  ctxt.lineTo(x3, y3);
  ctxt.lineTo(x3, y2);
  ctxt.closePath();

  ctxt.fillStyle = color;
  ctxt.fill();

  if (stroke_color) {
    radius = radius * 0.75;
    let x1 = Math.round(x + radius * sqrt_3_halves);
    let x2 = Math.round(x);
    let x3 = Math.round(x - radius * sqrt_3_halves);

    let y1 = Math.round(y - radius);
    let y2 = Math.round(y - radius * 0.5);
    let y3 = Math.round(y + radius * 0.5);
    let y4 = Math.round(y + radius);

    ctxt.beginPath();
    ctxt.moveTo(x2, y1);
    ctxt.lineTo(x1, y2);
    ctxt.lineTo(x1, y3);
    ctxt.lineTo(x2, y4);
    ctxt.lineTo(x3, y3);
    ctxt.lineTo(x3, y2);
    ctxt.closePath();

    ctxt.strokeStyle = stroke_color;
    ctxt.lineWidth = 2 * hex_margin;
    ctxt.stroke();
  }
};

// Draw the board on the game canvas.
let draw_board = function(ctxt, board, highlighted) {
  for (let i = 0; i < board.tiles.length; ++i)
    for (let j = 0; j < board.tiles[i].length; ++j)
      if (board.tiles[i][j] >= 0) {
        let xy = hex_to_cnvs(i, j, hex_radius, hex_margin);
        let x = board_offset_x + xy.x;
        let y = board_offset_y + xy.y;
        let stroke_color = undefined;

        if (i == 0 || j == 0 || i == board.tiles.length - 1 ||
            j == board.tiles.length - 1)
          stroke_color = "black";
        else if (i == highlighted_hex.i && j == highlighted_hex.j)
          stroke_color = colors_board[player_side];

        draw_hex(ctxt, x, y, hex_radius, colors_board[board.tiles[i][j]],
                 stroke_color);

        if (i == 0 || j == 0 || i == board.tiles.length - 1 ||
            j == board.tiles.length - 1) {
          draw_hex(ctxt, x, y, hex_radius, colors_board[board.tiles[i][j]],
                   "black");
        }
      }
};

// USER INTERFACE //////////////////////////////////////////////////////////////

// Handles to DOM elements.
let cnvs = undefined;                 // Canvas.
let ctxt = undefined;                 // Canvas context.
let top_bar = undefined;              // Top bar.
let join_link = undefined;            // Join link.
let your_info = undefined;            // Info about the player.
let turn_info = undefined;            // Info about current turn.
let bottom_bar = undefined;           // Bottom bar.
let help = undefined;                 // Help text (before starting game).
let moves_count = undefined;          // Moves counter.
let highlighted_hex_info = undefined; // Highlighted hex coordinates indicator.
let message = undefined;              // Message box.

// UI update interval.
let ui_update_interval = undefined;

// Convert player number to string.
let player_to_string = function(player) {
  if (player == 1)
    return "RED";
  else if (player == 2)
    return "BLUE";
  else
    return "undefined";
};

// Setup UI method.
let setup_ui = function() {
  // Top and bottom bars.
  {
    top_bar = document.getElementById("top-bar");
    top_bar.style.backgroundColor = colors_board[0];

    join_link = document.getElementById("join-link");
    your_info = document.getElementById("your-info");
    turn_info = document.getElementById("turn-info");

    bottom_bar = document.getElementById("bottom-bar");
    bottom_bar.style.backgroundColor = colors_board[0];

    help = document.getElementById("help");
    moves_count = document.getElementById("moves-count");
    highlighted_hex_info = document.getElementById("highlighted-hex");

    message = document.getElementById("message");
    message.style.backgroundColor = colors_board[0];
  }

  // Canvas and context.
  {
    cnvs = document.getElementById("canvas");
    ctxt = cnvs.getContext("2d");

    // When moving over canvas, highlight hexagons.
    cnvs.onmousemove = (e) => {
      let cnvs_bounding_rect = cnvs.getBoundingClientRect();
      let mouse_x = e.clientX - cnvs_bounding_rect.x;
      let mouse_y = e.clientY - cnvs_bounding_rect.y;

      highlighted_hex =
          cnvs_to_hex(mouse_x - board_offset_x, mouse_y - board_offset_y,
                      hex_radius, hex_margin);
      highlighted_hex_info.innerText =
          "(" + highlighted_hex.i + ", " + highlighted_hex.j + ")";
    };

    // When clicking on canvas, we apply the move if it is our turn.
    cnvs.onclick = (e) => {
      if (game && game.turn == player_side &&
          game.board.tiles[highlighted_hex.i][highlighted_hex.j] == 0)
        socket.emit("move", {i : highlighted_hex.i, j : highlighted_hex.j});
    };
  }

  window.onresize = () => {
    if (game) {
      // Adjust hexagon dimension according to the available window size.
      let desired_hex_radius_w =
          window.innerWidth /
          (sqrt_3 + 1.5 * sqrt_3 * (game.board.size - 1) * 13.0 / 12.0);
      let desired_hex_radius_h =
          (window.innerHeight - 2 * 42) /
          (2.0 * sqrt_3 + 1.5 * (game.board.size - 1) * 13.0 / 12.0);
      hex_radius =
          Math.min(desired_hex_radius_w, desired_hex_radius_h, max_hex_radius);
      hex_margin = hex_radius / 12;

      let new_canvas_width = Math.ceil(
          2 * board_offset_x +
          1.5 * (game.board.size - 1) * (sqrt_3 * (hex_radius + hex_margin)));
      let new_canvas_height =
          Math.ceil(2 * board_offset_y +
                    1.5 * (hex_radius + hex_margin) * (game.board.size - 1));

      if (new_canvas_width != canvas.width ||
          new_canvas_height != canvas.height) {
        canvas.width = new_canvas_width;
        canvas.height = new_canvas_height;
      }
    }
  };

  ui_update_interval = setInterval(function() {
    // Redraw the board.
    ctxt.fillStyle = "white";
    ctxt.fillRect(0, 0, cnvs.width, cnvs.height);

    if (game)
      draw_board(ctxt, game.board, highlighted_hex);
  }, 1000.0 / 60);
};

// GAME CONTROL/////////////////////////////////////////////////////////////////

// Our player side (1 or 2).
let player_side = undefined;

// Game object.
let game = undefined;

// CONNECTION TO SERVER ////////////////////////////////////////////////////////

// Socket.io handle.
let socket = undefined;

let setup_connection = function() {
  // This connects by default to the same guy that serves the page.
  socket = io();

  // Event fired to set id.
  socket.on("id", (data) => {
    socket.id = data;

    join_link.href = window.location.origin + "?join=" + socket.id;
    join_link.innerText = join_link.href;
  });

  // Event fired to set player side.
  socket.on("playerSide", (data) => {
    player_side = data;
    top_bar.style.backgroundColor = colors_board[player_side];
    bottom_bar.style.backgroundColor = colors_board[player_side];
    message.style.backgroundColor = colors_board[player_side];
  });

  // Event fired when receiving the game state. This simply copies the state
  // into the game variable.
  socket.on("gameState", (data) => {
    // Store game state.
    game = data;

    // Adjust canvas size.
    window.onresize();

    // Update top bar.
    join_link.hidden = true;
    your_info.hidden = false;
    your_info.innerText = "you are " + player_to_string(player_side);
    turn_info.hidden = false;
    if (game.winner == 0 && game.turn != 0)
      turn_info.innerText = player_to_string(game.turn) + "'s turn";
    else if (game.winner != 0)
      turn_info.innerText = player_to_string(game.winner) + " wins";
    else
      turn_info.innerText = "";

    // Update bottom bar.
    help.hidden = true;
    moves_count.hidden = false;
    moves_count.innerText = "moves: " + game.moves;
    highlighted_hex_info.hidden = false;
    highlighted_hex_info.innerText =
        "(" + highlighted_hex.i + ", " + highlighted_hex.j + ")";
  });

  // When the connection is ready, if there's a join parameter in the URL, we
  // send a join event.
  socket.on("connect", () => {
    let params = new URLSearchParams(window.location.search);
    let joinId = params.get("join");

    if (joinId)
      socket.emit("join", joinId);
  });

  socket.on("gameOver", (reason) => {
    if (reason == "player disconnection")
      message.innerText = "your opponent left. click to continue";
    else if (reason == "player 1 wins")
      message.innerText = player_to_string(1) + " wins. click to continue";
    else if (reason == "player 2 wins")
      message.innerText = player_to_string(2) + " wins. click to continue";

    message.hidden = false;
    message.onclick = function() {
      socket.emit("lobby");

      message.hidden = true;
      join_link.hidden = false;
      your_info.hidden = true;
      turn_info.hidden = true;
      help.hidden = false;
      moves_count.hidden = true;
      highlighted_hex_info.hidden = true;

      top_bar.style.backgroundColor = colors_board[0];
      bottom_bar.style.backgroundColor = colors_board[0];
      message.style.backgroundColor = colors_board[0];

      game = undefined;
    };
  });
};

// APP FLOW ////////////////////////////////////////////////////////////////////

let setup = function() {
  setup_ui();
  setup_connection();
};

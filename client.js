// BOARD RENDERING /////////////////////////////////////////////////////////////

// Precomputed constants.
const sqrt_3 = Math.sqrt(3);
const sqrt_3_halves = sqrt_3 / 2.0;

// Hex radius.
let hex_radius = 32;

// Maximum hex radius.
const max_hex_radius = 32;

// Hex margin.
let hex_margin = 3;

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
const colors_board_highlight = [
  "#A0A0A0", // Empty tile.
  "#DD3000", // Player 1.
  "#0030DD"  // Player 2.
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
let draw_board = function(ctxt, board, highlighted, last_move) {
  if (last_move)
    console.log("last_move = " + last_move.toString());

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
        else if (last_move && i == last_move[1] && j == last_move[2])
          stroke_color = "white";
        else if (i == highlighted_hex.i && j == highlighted_hex.j)
          stroke_color = colors_board[player_side];

        let fill_color = colors_board[board.tiles[i][j]];

        draw_hex(ctxt, x, y, hex_radius, fill_color, stroke_color);
      }
};

// USER INTERFACE //////////////////////////////////////////////////////////////

// Handles to DOM elements.
let cnvs = undefined; // Canvas.
let ctxt = undefined; // Canvas context.

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

// Desired board size.
let board_size = board_size_default;

// Desired swap rule.
let swap_rule = swap_rule_default;

// Setup lobby interface.
let setup_ui_lobby = function() {
  // Set color for top and bottom bars.
  $(".bar").css("background-color", colors_board[0]);

  // Board size slider.
  let update_board_size = (new_size) => {
    board_size = Math.min(Math.max(new_size, board_size_min), board_size_max);

    // Update marker position.
    let left =
        ((board_size - board_size_min) / (board_size_max - board_size_min) *
         ($("#board-size #bar").width() - $("#board-size #marker").width()))
            .toString();
    $("#board-size #marker").css("left", left + "px").text(board_size);

    if (socket)
      socket.emit("settings",
                  {"board_size" : board_size, "swap_rule" : swap_rule});
  };
  update_board_size(11);

  $("#board-size #less")
      .on("click", () => { update_board_size(board_size - 1); });
  $("#board-size #more")
      .on("click", () => { update_board_size(board_size + 1); });

  // Swap rule.
  let set_swap_rule = (r) => {
    swap_rule = r;

    if (swap_rule)
      $("#swap-rule #marker")
          .addClass("blue")
          .removeClass("red")
          .css("right", "0")
          .css("left", "")
          .text("on");
    else
      $("#swap-rule #marker")
          .addClass("red")
          .removeClass("blue")
          .css("right", "")
          .css("left", "0")
          .text("off");

    if (socket)
      socket.emit("settings",
                  {"board_size" : board_size, "swap_rule" : swap_rule});
  };

  $("#swap-rule #wrapper").on("click", () => { set_swap_rule(!swap_rule); });
  $("#surrender").on("click", () => { socket.emit("surrender"); });
};

// Setup game interface.
let setup_ui_game = function() {
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

    $("#highlighted-hex")
        .text("(" + highlighted_hex.i + ", " + highlighted_hex.j + ")");
  };

  // When clicking on canvas, we apply the move if it is our turn.
  cnvs.onclick = (e) => {
    if (game && game.turn == player_side &&
        game.board.tiles[highlighted_hex.i][highlighted_hex.j] == 0)
      socket.emit("move", {i : highlighted_hex.i, j : highlighted_hex.j});
  };

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
};

// Setup UI method.
let setup_ui = function() {
  setup_ui_lobby();
  setup_ui_game();
};

// Update game UI.
let update_ui_game = function() {
  $("#your-info").text("you are " + player_to_string(player_side));

  if (game.winner == 0 && game.turn != 0)
    $("#turn-info").text(player_to_string(game.turn) + "'s turn");
  else if (game.winnder != 0)
    $("#turn-info").text(player_to_string(game.winner) + " wins");
  else
    $("#turn-info").text("");

  $("#moves-count").text("moves: " + game.moves.length);

  if (game.swap_rule && game.moves.length == 1 && game.turn == player_side &&
      !game.swapped)
    $("#swap")
        .css("background-color", colors_board[player_side])
        .on("click", () => { socket.emit("swap"); });
  else
    $("#swap").css("background-color", colors_board[0]).off("click");
};

// Switch UI state.
let switch_ui_state = function(state) {
  // Clear interval.
  clearInterval(ui_update_interval);

  // Hide and show stuff.
  if (state == "lobby") {
    $("#lobby").show();
    $("#game").hide();
  } else if (state == "game") {
    $("#lobby").hide();
    $("#game").show();

    // Adjust canvas size.
    window.onresize();

    ui_update_interval = setInterval(function() {
      // Redraw the board.
      ctxt.fillStyle = "white";
      ctxt.fillRect(0, 0, cnvs.width, cnvs.height);

      if (game)
        draw_board(ctxt, game.board, highlighted_hex,
                   game.moves.length > 0 ? game.moves[game.moves.length - 1]
                                         : undefined);
    }, 1000.0 / 60);
  }
};

// Show a message.
let message = function(text, onclick) {
  $("#message")
      .css("background-color", colors_board[player_side])
      .text(text)
      .show()
      .on("click", () => {
        onclick();
        $("#message").hide();
      });
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

    let url = window.location.origin + "?join=" + socket.id;
    $("#join-link").attr("href", url).text(url);
  });

  // Event fired to set player side.
  socket.on("playerSide", (data) => {
    player_side = data;
    $("#game .bar").css("background-color", colors_board[player_side]);
    $("#surrender").css("background-color", colors_board[player_side]);
  });

  // Event fired when receiving the game state. This simply copies the state
  // into the game variable.
  socket.on("gameState", (data) => {
    // Store game state.
    game = data;

    // Update UI.
    switch_ui_state("game");
    update_ui_game();
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
    let msg = "";
    if (reason == "player disconnection")
      msg = "your opponent left. click to continue";
    else if (reason == "player 1 wins")
      msg = player_to_string(1) + " wins. click to continue";
    else if (reason == "player 2 wins")
      msg = player_to_string(2) + " wins. click to continue";
    else if (reason == "player 1 surrenders")
      msg = player_to_string(2) + " wins, " + player_to_string(1) +
            " surrenders. click to continue";
    else if (reason == "player 2 surrenders")
      msg = player_to_string(1) + " wins, " + player_to_string(2) +
            " surrenders. click to continue";

    message(msg, function() {
      socket.emit("lobby");
      switch_ui_state("lobby");
      game = undefined;
    });
  });
};

// APP FLOW ////////////////////////////////////////////////////////////////////

let setup = function() {
  setup_ui();
  setup_connection();
};

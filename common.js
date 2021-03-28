// DEFAULT GAME SETTINGS ///////////////////////////////////////////////////////

// Default board size.
const board_size_default = 11;

// Maximum board size.
const board_size_max = 16;

// Minimum board size.
const board_size_min = 6;

// Default swap rule.
const swap_rule_default = false;

// GAME LOGIC //////////////////////////////////////////////////////////////////

// Retrieve tiles that are adjacent to a given tile.
let adjacentTiles = function(i, j, size) {
  let tiles = [];

  if (i > 0)
    tiles.push([ i - 1, j ]);
  if (i < size - 1)
    tiles.push([ i + 1, j ]);
  if (j > 0)
    tiles.push([ i, j - 1 ]);
  if (j < size - 1)
    tiles.push([ i, j + 1 ]);
  if (i > 0 && j < size - 1)
    tiles.push([ i - 1, j + 1 ]);
  if (i < size - 1 && j > 0)
    tiles.push([ i + 1, j - 1 ]);

  return tiles;
};

// Board of a hex game.
let HexBoard = function(size) {
  // Size of the board.
  this.size = size;

  // Tiles of the board. Each tile can be either -1 (invalid/out of board), 0
  // (no player), 1 (player 1) or 2 (player 2). Initially, the board is empty,
  // i.e. all zero, but for its boundaries. The boundaries are given to player 1
  // and player 2.
  this.tiles = [];
  for (let i = 0; i < this.size; ++i) {
    this.tiles.push([]);

    for (let j = 0; j < this.size; ++j)
      if ((i == 0 && j == 0) || (i == this.size - 1 && j == this.size - 1))
        this.tiles[i].push(-1);
      else if (i == 0 || i == this.size - 1)
        this.tiles[i].push(1);
      else if (j == 0 || j == this.size - 1)
        this.tiles[i].push(2);
      else
        this.tiles[i].push(0);
  }

  // Apply a move to the board.
  this.move = function(player, i, j) {
    // Sanity checks.
    console.assert(player == 1 || player == 2,
                   "Board.move(): player must be either 1 or 2.");
    console.assert(this.tiles[i][j] == 0, "Board.move(): tile must be empty.");

    // Apply the move.
    this.tiles[i][j] = player;
    return true;
  };

  // Check if there exists a path connecting the two edges for a given player.
  this.checkVictory = function(player) {
    // We place a seed on one edge of the board that belongs to the given
    // player. Then we explore the board, starting from that seed, moving only
    // on tiles belonging to that player. If we hit the other side we return
    // true. If we never do, we return false.
    let seed = player == 1 ? [ 0, 1 ] : [ 1, 0 ];
    let tiles_to_visit = [ seed ];

    let visited = [];
    for (let i = 0; i < this.size; ++i) {
      visited.push([]);
      for (let j = 0; j < this.size; ++j)
        visited[i].push(false);
    }

    while (tiles_to_visit.length > 0) {
      // Retrieve next tile to be visited.
      let tile = tiles_to_visit.shift();

      // If it has already been visited, just ignore it and continue.
      if (visited[tile[0]][tile[1]])
        continue;

      // If it has not been visited, but belongs to the "opposite" side, we
      // return true.
      else if ((player == 1 && tile[0] == this.size - 1 &&
                tile[1] < this.size - 1) ||
               (player == 2 && tile[0] < this.size - 1 &&
                tile[1] == this.size - 1))
        return true;

      // In all other cases, we mark it as visited and retrieve the adjacent
      // tiles.
      visited[tile[0]][tile[1]] = true;
      let adjacent = adjacentTiles(tile[0], tile[1], this.size);

      // For each adjacent tile, we check if it belongs to the player. If it
      // does, we append it to the list of tiles to be visited.
      for (let k = 0; k < adjacent.length; ++k)
        if (this.tiles[adjacent[k][0]][adjacent[k][1]] == player)
          tiles_to_visit.push(adjacent[k]);
    }

    return false;
  };
};

// Game object.
let HexGame = function(board_size, swap_rule) {
  // Game board.
  this.board = new HexBoard(board_size);

  // Number of moves so far.
  this.moves = 0;

  // Whose turn it is.
  this.turn = 1;

  // Game finished flag.
  this.finished = false;

  // Winner.
  this.winner = 0;

  // Whether swap rule is enabled or not.
  this.swap_rule = swap_rule;

  // Whether swap rule was used or not.
  this.swapped = false;

  // Apply a move to the board and go to next player if the move was successful.
  this.move = function(i, j) {
    if (this.board.move(this.turn, i, j)) {
      ++this.moves;
      this.finished = this.board.checkVictory(this.turn);

      if (!this.finished)
        this.turn = this.turn == 1 ? 2 : 1;
      else {
        this.winner = this.turn;
        this.turn = 0;
      }

      return true;
    } else
      return false;
  };
};

// Expose stuff for NodeJS /////////////////////////////////////////////////////

if (typeof module !== "undefined") {
  module.exports = {
    "Game" : HexGame,
    "Board" : HexBoard,
    "board_size_default" : board_size_default,
    "board_size_min" : board_size_min,
    "board_size_max" : board_size_max,
    "swap_rule_default" : swap_rule_default
  };
}

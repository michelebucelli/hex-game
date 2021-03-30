# hex-game
A Node.js multiplayer implementation of the [Hex board game](https://en.wikipedia.org/wiki/Hex_(board_game)).

## The game
**Hex** is played between two players (red and blue) on a rhombus board made of hexagonal tiles. Each player is assigned a pair of opposite sides of the board. The players take turns at placing a peg of their color in one of the empty tiles of the board. The aim is to connect the two opposite sides with a path formed by pegs of your color.

#### How to play
- connect to [https://game-of-hex.herokuapp.com](https://game-of-hex.herokuapp.com);
- copy the link on the top-left corner of the screen and send it to your friend;
- on your turn, click on an empty tile to place your peg.

#### Interesting resources
- [English Wikipedia page on Hex](https://en.wikipedia.org/wiki/Hex_(board_game));
- [a wiki dedicated to Hex](https://www.hexwiki.net/index.php/Main_Page).

---

## Contributing
Please report bugs and/or suggestions of any kind in the [issue tracker](https://github.com/michelebucelli/hex-game/issues). If you want to add some features feel free to open a pull request. Below you'll find a list of tasks that I'd like to implement in the future.

---

## TODO list
- [ ] show list of moves;
- [ ] improve interface for mobile;
- [ ] allow a disconnected player to resume a game;
- [ ] generally improve feedback for the player (ideas welcome!):
  - make clearer whose turn it is;
  - make clearer when swap rule is used by the opponent;
- [ ] keyboard controls;

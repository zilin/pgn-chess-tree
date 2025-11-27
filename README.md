# pgn-chess-tree

Python-chess compatible game tree API for PGN parsing. Built on top of [@mliebelt/pgn-parser](https://github.com/mliebelt/pgn-parser).

## Features

- **Python-chess compatible API**: Uses the same tree structure and methods as [python-chess](https://python-chess.readthedocs.io/)
- **Full move validation**: Includes a complete chess Board class with legal move generation
- **Variation support**: Properly handles nested variations matching python-chess behavior
- **FEN tracking**: Each node tracks the board position after that move
- **Annotations**: Supports NAGs, comments, arrows, shapes, clock times, and eval

## Installation

```bash
npm install pgn-chess-tree
```

## Quick Start

```typescript
import { readGame, readGames } from 'pgn-chess-tree';

// Read a single game
const game = readGame(`
  [Event "Example"]
  [White "Player1"]
  [Black "Player2"]
  
  1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 3. Bb5 *
`);

// Access headers (like python-chess game.headers)
console.log(game.headers.get("Event"));  // "Example"
console.log(game.headers.get("White"));  // "Player1"

// Iterate mainline moves (like python-chess game.mainline())
for (const node of game.mainline()) {
  console.log(node.san());   // "e4", "e5", "Nf3", "Nc6", "Bb5"
  console.log(node.uci());   // "e2e4", "e7e5", etc.
  console.log(node.fen());   // FEN after this move
}

// Access variations (like python-chess)
const e4 = game.variations[0];
console.log(e4.variations.length);         // 2 (e5 and c5)
console.log(e4.variations[0].san());       // "e5" (mainline)
console.log(e4.variations[1].san());       // "c5" (variation)

// Tree navigation
const lastNode = game.end();               // Follow mainline to end
const root = lastNode.root();              // Get game root
console.log(lastNode.isEnd());             // true
console.log(lastNode.isMainline());        // true

// Board state at any node
const board = lastNode.board();
console.log(board.fen());
console.log(board.turn);                   // false (black to move)
console.log([...board.legalMoves()]);      // All legal moves
```

## API Reference

### Reading Games

```typescript
// Read a single game (returns null if empty/invalid)
const game = readGame(pgnString);

// Read multiple games
const games = readGames(pgnString);

// Iterator for large files
for (const game of iterGames(pgnString)) {
  console.log(game.headers.get("White"));
}
```

### Game Class

The root node of a game tree. Extends `GameNode`.

```typescript
// Headers
game.headers.get("Event")
game.headers.set("Event", "My Tournament")

// Root-level comment
game.comment                // Comment before first move

// First move(s)
game.variations             // Array of first moves
game.variations[0]          // First move of mainline

// Errors during parsing
game.errors                 // Array of parse errors
```

### GameNode Class

Represents a node in the game tree.

```typescript
// Move information
node.move          // Move object (null for root)
node.san()         // SAN notation: "e4", "Nf3", "O-O"
node.uci()         // UCI notation: "e2e4", "g1f3"

// Board state
node.board()       // Board object after this move
node.fen()         // FEN string after this move

// Annotations
node.comment       // Comment after move
node.startingComment  // Comment before move
node.nags          // Set<number> of NAGs ($1, $2, etc.)
node.clock         // Clock time in seconds
node.eval          // Engine eval
node.arrows        // Arrow annotations
node.shapes        // Shape/highlight annotations

// Tree navigation
node.parent        // Parent node (null for root)
node.variations    // Child nodes
node.isEnd()       // No more moves?
node.isMainline()  // Is this node in the mainline?
node.next()        // First child (mainline continuation)
node.root()        // Get the Game object
node.end()         // Follow mainline to terminal node

// Iteration
node.mainline()    // Iterate mainline nodes
node.mainlineMoves()  // Iterate mainline Move objects
node.countNodes()  // Count nodes in subtree

// Modification
node.addVariation(move)      // Add a variation
node.addMainVariation(move)  // Add as new mainline
node.addLine(moves)          // Add sequence of moves
node.removeVariation(child)  // Remove a variation
node.promote()               // Move up in variation order
node.promoteToMain()         // Make this the mainline
```

### Board Class

Full chess board with move generation and validation.

```typescript
import { Board, Move } from 'pgn-chess-tree';

const board = new Board();           // Starting position
const board2 = new Board(fenString); // From FEN

// Make moves
board.push(Move.fromUci("e2e4"));
board.pushSan("Nf3");
board.pushUci("e7e5");

// Undo moves
const move = board.pop();

// Position queries
board.fen()                     // Current FEN
board.turn                      // true=white, false=black
board.pieceAt(square)           // Piece at square
board.isCheck()                 // Is current player in check?
board.isCheckmate()             // Is it checkmate?
board.legalMoves()              // Iterator of legal moves

// Move conversion
board.san(move)                 // Get SAN for a move
board.parseSan("Nf3")           // Parse SAN to Move
```

### Move Class

```typescript
import { Move } from 'pgn-chess-tree';

// Create moves
const move = Move.fromUci("e2e4");
const promo = Move.fromUci("e7e8q");

// Properties
move.fromSquare     // 12 (e2)
move.toSquare       // 28 (e4)
move.promotion      // null or piece type (2-5)
move.uci()          // "e2e4"
move.equals(other)  // Compare moves
```

## Comparison with python-chess

This library provides an API that closely matches python-chess:

| python-chess | pgn-chess-tree |
|-------------|----------------|
| `chess.pgn.read_game(file)` | `readGame(string)` |
| `game.headers["White"]` | `game.headers.get("White")` |
| `game.mainline()` | `game.mainline()` |
| `node.board()` | `node.board()` |
| `node.san()` | `node.san()` |
| `node.variations` | `node.variations` |
| `node.is_mainline()` | `node.isMainline()` |
| `board.push(move)` | `board.push(move)` |
| `board.fen()` | `board.fen()` |

## License

MIT


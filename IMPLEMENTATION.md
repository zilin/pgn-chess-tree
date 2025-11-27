# Implementation Reference: pgn-chess-tree

**Package:** `pgn-chess-tree`  
**Purpose:** Python-chess compatible game tree API for PGN parsing  
**Built on:** `@mliebelt/pgn-parser`

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Classes](#core-classes)
4. [API Reference](#api-reference)
5. [How It Works](#how-it-works)
6. [Test Infrastructure](#test-infrastructure)
7. [File Structure](#file-structure)
8. [python-chess Comparison](#comparison-python-chess-vs-pgn-chess-tree)

---

## Overview

This package provides a python-chess compatible API for parsing PGN files into game trees. It uses `@mliebelt/pgn-parser` for the underlying PEG parsing and adds:

- **Tree structure** with `GameNode` objects and parent/child references
- **Board state tracking** with FEN at every node
- **Move validation** against current position
- **Traversal API** matching python-chess exactly

### Key Differences from pgn-parser

| pgn-parser | pgn-chess-tree |
|------------|----------------|
| Flat `PgnMove[]` array | Tree of `GameNode` objects |
| Variations as `variations: PgnMove[][]` | Variations as `node.variations: GameNode[]` |
| No parent references | `node.parent` reference |
| No board state | `node.board()` returns Board |
| Pure syntactic parsing | Move validation included |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      pgn-chess-tree                              │
├─────────────────────────────────────────────────────────────────┤
│  readGame(pgn) / readGames(pgn)                                 │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ @mliebelt/       │     │   Tree Builder   │                  │
│  │ pgn-parser       │────▶│ (tree-builder.ts)│                  │
│  │ parseGame()      │     │                  │                  │
│  └──────────────────┘     └────────┬─────────┘                  │
│                                    │                             │
│                                    ▼                             │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    Game Tree                          │       │
│  │  ┌──────────┐                                        │       │
│  │  │   Game   │  (root node with headers)              │       │
│  │  └────┬─────┘                                        │       │
│  │       │                                              │       │
│  │  ┌────▼─────┐    ┌──────────┐                       │       │
│  │  │ GameNode │───▶│ GameNode │  (first move + reply) │       │
│  │  │  (e4)    │    │  (e5)    │                       │       │
│  │  └────┬─────┘    └────┬─────┘                       │       │
│  │       │               │                              │       │
│  │  ┌────▼─────┐    ┌────▼─────┐                       │       │
│  │  │ GameNode │    │ GameNode │  (variations)         │       │
│  │  │  (c5)    │    │  (Nf3)   │                       │       │
│  │  └──────────┘    └──────────┘                       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                   Chess Module                        │       │
│  │  • Board - position tracking & move validation       │       │
│  │  • Move - move representation                        │       │
│  │  • Piece - piece representation                      │       │
│  │  • Types - Square, Color, PieceType constants        │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Classes

### Game (extends GameNode)

The root node of a game tree. Contains headers and the move tree.

```typescript
class Game extends GameNode {
  headers: Headers;       // PGN tags (Event, White, Black, etc.)
  errors: GameError[];    // Parsing errors encountered
}
```

### GameNode

Base class for all nodes in the game tree. Matches python-chess `chess.pgn.GameNode`.

```typescript
class GameNode {
  // Tree structure
  parent: GameNode | null;      // Parent node (null for root)
  move: Move | null;            // Move that led here (null for root)
  variations: GameNode[];       // Child nodes (first is mainline)
  
  // Annotations
  comment: string;              // Comment after move
  startingComment: string;      // Comment before move
  nags: Set<number>;            // NAGs ($1, $2, etc.)
  clock: number | null;         // Clock time in seconds
  eval: number | null;          // Engine evaluation
  arrows: Arrow[];              // Arrow annotations
  shapes: Shape[];              // Highlight annotations
  
  // Methods
  board(): Board;               // Get position after this move
  fen(): string;                // Get FEN after this move
  san(): string | null;         // Get SAN notation
  uci(): string | null;         // Get UCI notation
  
  // Navigation
  isEnd(): boolean;             // Is this terminal?
  isMainline(): boolean;        // Is this in the mainline?
  root(): GameNode;             // Get root node
  end(): GameNode;              // Follow mainline to end
  next(): GameNode | null;      // Get first child
  mainline(): Iterator<GameNode>;
  mainlineMoves(): Iterator<Move>;
  
  // Modification
  addVariation(move: Move): GameNode;
  addMainVariation(move: Move): GameNode;
  removeVariation(node: GameNode): void;
  promote(): void;
  promoteToMain(): void;
}
```

### Board

Chess position with move generation and validation. Matches python-chess `chess.Board`.

```typescript
class Board {
  // State
  turn: Color;                  // WHITE or BLACK
  castlingRights: number;       // Bitmask
  epSquare: Square | null;      // En passant square
  halfmoveClock: number;
  fullmoveNumber: number;
  
  // Piece access
  pieceAt(square: Square): Piece | null;
  
  // Move making
  push(move: Move): void;
  pop(): Move | null;
  pushSan(san: string): Move;
  pushUci(uci: string): Move;
  
  // Move parsing
  parseSan(san: string): Move;
  san(move: Move): string;
  
  // Position queries
  isCheck(): boolean;
  isCheckmate(): boolean;
  isStalemate(): boolean;
  legalMoves(): Iterator<Move>;
  
  // FEN
  fen(): string;
  setFen(fen: string): void;
  copy(): Board;
}
```

### Move

Move representation. Matches python-chess `chess.Move`.

```typescript
class Move {
  fromSquare: Square;           // Source square (0-63)
  toSquare: Square;             // Target square (0-63)
  promotion: PieceType | null;  // Promotion piece (2-5)
  drop: PieceType | null;       // Drop piece (crazyhouse)
  
  uci(): string;                // "e2e4", "e7e8q"
  equals(other: Move): boolean;
  
  static fromUci(uci: string): Move;
  static null(): Move;
}
```

### Constants (matching python-chess)

```typescript
// Colors
const WHITE = true;
const BLACK = false;

// Piece types (integers 1-6)
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

// Squares (integers 0-63)
const A1 = 0, B1 = 1, ... H8 = 63;

// NAGs
const NAG_GOOD_MOVE = 1;        // !
const NAG_MISTAKE = 2;          // ?
const NAG_BRILLIANT_MOVE = 3;   // !!
const NAG_BLUNDER = 4;          // ??
```

---

## API Reference

### Reading Games

```typescript
import { readGame, readGames } from 'pgn-chess-tree';

// Read single game
const game = readGame(pgnString);
if (game) {
  console.log(game.headers.get("Event"));
}

// Read multiple games
const games = readGames(pgnString);
for (const game of games) {
  console.log(game.headers.get("White"));
}
```

### Traversing the Tree

```typescript
// Mainline iteration
for (const node of game.mainline()) {
  console.log(node.san());   // "e4", "e5", "Nf3"
}

// Access variations
const e4 = game.variations[0];  // First move
console.log(e4.variations.length);  // Number of responses

// Navigate to end
const lastNode = game.end();
console.log(lastNode.fen());

// Check structure
console.log(node.isMainline());
console.log(node.isEnd());
```

### Board State

```typescript
// Get board at any node
const board = node.board();
console.log(board.fen());
console.log(board.turn);  // WHITE or BLACK

// Check position
console.log(board.isCheck());
console.log(board.isCheckmate());

// Get legal moves
for (const move of board.legalMoves()) {
  console.log(board.san(move));
}
```

### Modifying the Tree

```typescript
// Add a variation
const newNode = game.addVariation(Move.fromUci("d2d4"));

// Add a line
const lastNode = game.addLine([
  Move.fromUci("e2e4"),
  Move.fromUci("e7e5"),
]);

// Promote variation to mainline
node.promoteToMain();

// Remove a variation
parent.removeVariation(node);
```

---

## How It Works

### Tree Building Process

The `buildGameTree()` function converts the flat `ParseTree` from pgn-parser into a proper tree:

1. **Parse PGN** using `@mliebelt/pgn-parser`'s `parseGame()`:
   ```typescript
   const parseTree = parseGame(pgn, { startRule: 'game' });
   // Returns: { tags: {...}, moves: PgnMove[] }
   ```

2. **Create root Game node** with headers:
   ```typescript
   const game = new Game();
   game.headers = new Headers(parseTree.tags);
   ```

3. **Build move tree recursively**:
   ```typescript
   function buildMoveTree(parentNode, moves, board) {
     for (const pgnMove of moves) {
       // Parse move using board
       const move = board.parseSan(pgnMove.notation.notation);
       
       // Create node
       const node = new GameNode();
       node.parent = parentNode;
       node.move = move;
       
       // Add to parent
       parentNode.variations.push(node);
       
       // Apply move
       board.push(move);
       
       // Process variations (key insight: variations branch from PARENT)
       if (pgnMove.variations) {
         for (const varMoves of pgnMove.variations) {
           const varBoard = new Board(fenBeforeThisMove);
           buildMoveTree(parentNode, varMoves, varBoard);
         }
       }
     }
   }
   ```

### Variation Handling

**Key insight:** In python-chess, variations branch from the node BEFORE the alternative move, not from the move itself.

```
PGN: 1. e4 e5 (1... c5 2. Nf3) 2. Nf3

pgn-parser output:
  moves[0] = e4 (no variations)
  moves[1] = e5 (variations: [[c5, Nf3]])  <-- variation attached here
  moves[2] = Nf3

python-chess tree structure:
  root
   └── e4
        ├── e5 (mainline)
        │    └── Nf3
        └── c5 (variation)  <-- sibling of e5, not child
             └── Nf3
```

The tree builder handles this by adding variations as siblings of the current move, not as children:

```typescript
// When processing e5 with variation [c5, Nf3]:
// - e5 is added as child of e4
// - c5 is ALSO added as child of e4 (sibling of e5)
parentNode.variations.push(newNode);  // e5

for (const varMoves of pgnMove.variations) {
  buildMoveTree(parentNode, varMoves, boardBeforeThisMove);  // c5 added to e4
}
```

### Board State Caching

Each node caches its board state for efficiency:

```typescript
class GameNode {
  private _board: Board | null = null;
  
  board(): Board {
    if (this._board) return this._board.copy();
    
    // Build by replaying from root
    let board = new Board(this.getStartingFen());
    let node = this;
    const moves = [];
    while (node.parent) {
      moves.unshift(node.move);
      node = node.parent;
    }
    for (const move of moves) {
      board.push(move);
    }
    
    this._board = board;
    return board.copy();
  }
}
```

---

## Test Infrastructure

The test suite verifies that `pgn-chess-tree` produces the exact same tree structure as `python-chess`.

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `test/test-game-node.ts` | Unit tests for GameNode, Board, Move classes | 34 |
| `test/test-python-chess-compat.ts` | Compatibility tests against python-chess | 26 |

### Running Tests

```bash
npm test
```

### Generating References & Detailed Testing Instructions

See **[TESTING.md](./TESTING.md)** for complete instructions on:

- Setting up Python and python-chess
- Generating reference JSON files from PGN files
- Running compatibility tests
- Adding new test files
- Troubleshooting common issues

---

## File Structure

```
pgn-chess-tree/
├── package.json
├── README.md
├── IMPLEMENTATION.md         # This file
├── tsconfig*.json
│
├── src/
│   ├── index.ts              # Main exports
│   │
│   ├── chess/                # Chess logic module
│   │   ├── index.ts          # Re-exports
│   │   ├── types.ts          # Square, Color, PieceType constants
│   │   ├── move.ts           # Move class
│   │   ├── piece.ts          # Piece class
│   │   └── board.ts          # Board class (700+ lines)
│   │
│   └── pgn/                  # PGN tree module
│       ├── index.ts          # readGame, readGames exports
│       ├── headers.ts        # Headers class
│       ├── game-node.ts      # GameNode class (400+ lines)
│       ├── game.ts           # Game class (extends GameNode)
│       └── tree-builder.ts   # ParseTree → Game conversion
│
└── test/
    ├── test-game-node.ts     # Unit tests
    ├── test-python-chess-compat.ts  # Compatibility tests
    │
    ├── scripts/
    │   └── generate-reference.py    # Python reference generator
    │
    └── reference-trees/      # JSON references from python-chess
        ├── joshua_black_15_32.json
        ├── joshua_white_15_4.json
        └── ... (23 files)
```

---

## Comparison: python-chess vs pgn-chess-tree

| python-chess | pgn-chess-tree |
|--------------|----------------|
| `chess.pgn.read_game(file)` | `readGame(string)` |
| `game.headers["White"]` | `game.headers.get("White")` |
| `game.mainline()` | `game.mainline()` |
| `node.board()` | `node.board()` |
| `node.san()` | `node.san()` |
| `node.move.uci()` | `node.uci()` |
| `node.variations` | `node.variations` |
| `node.is_mainline()` | `node.isMainline()` |
| `node.is_end()` | `node.isEnd()` |
| `node.add_variation(move)` | `node.addVariation(move)` |
| `node.promote_to_main()` | `node.promoteToMain()` |
| `board.push(move)` | `board.push(move)` |
| `board.pop()` | `board.pop()` |
| `board.fen()` | `board.fen()` |
| `board.is_check()` | `board.isCheck()` |
| `Move.from_uci(uci)` | `Move.fromUci(uci)` |
| `move.uci()` | `move.uci()` |

---

## Dependencies

### Runtime
- `@mliebelt/pgn-parser` - PEG-based PGN parsing

### Development
- `@mliebelt/pgn-types` - TypeScript types
- `typescript` - Compilation
- `uvu` - Test framework
- `tsm` - TypeScript execution

### For Reference Generation
- Python 3.8+
- `python-chess` (`pip install chess`)


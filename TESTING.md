# Testing Guide: pgn-chess-tree

This guide explains how to test `pgn-chess-tree` against `python-chess` to ensure compatibility.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Generating Reference Trees](#generating-reference-trees)
4. [Running Tests](#running-tests)
5. [Adding New Test Files](#adding-new-test-files)
6. [Troubleshooting](#troubleshooting)
7. [Quick Reference](#quick-reference)

---

## Overview

The test suite verifies that `pgn-chess-tree` produces the exact same tree structure as `python-chess`. This is done by:

1. **Generate**: Parse PGN files with python-chess and export trees as JSON
2. **Parse**: Parse the same PGN files with pgn-chess-tree  
3. **Compare**: Verify the structures match

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `test/test-game-node.ts` | Unit tests for GameNode, Board, Move classes | 34 |
| `test/test-python-chess-compat.ts` | Compatibility tests against python-chess | 26 |

---

## Prerequisites

### Node.js Dependencies

```bash
npm install
```

### Python Requirements

To generate reference files, you need Python 3 with python-chess.

#### Option A: Using Virtual Environment (Recommended)

```bash
# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install python-chess
pip install chess

# Verify installation
python -c "import chess; print(chess.__version__)"
```

#### Option B: Global Installation

```bash
# Check Python version (3.8+ required)
python3 --version

# Install python-chess
pip install chess
# or
pip3 install chess
```

---

## Generating Reference Trees

### Step 1: Prepare Your PGN Files

Place your PGN files in the `pgns/` directory at the project root.

```
pgn-chess-tree/
├── pgns/                    <-- Put PGN files here
│   ├── game1.pgn
│   ├── game2.pgn
│   └── ...
└── test/
    └── scripts/
        └── generate-reference.py
```

### Step 2: Run the Reference Generator

```bash
# If using venv, make sure it's activated first:
# source venv/bin/activate

python3 test/scripts/generate-reference.py
```

**Expected Output:**
```
Found 23 PGN files
Output directory: /path/to/pgn-chess-tree/test/reference-trees

Processing: game1.pgn
  -> Generated game1.json (1 games)
Processing: game2.pgn
  -> Generated game2.json (3 games)
...
Done!
```

### Step 3: Verify Generated Files

```bash
ls test/reference-trees/
# Should show: game1.json, game2.json, ...
```

### Reference File Structure

Each JSON file contains:

```json
{
  "source_file": "game1.pgn",
  "games_count": 1,
  "games": [
    {
      "headers": {
        "Event": "Example",
        "White": "Player1",
        "Black": "Player2",
        "Result": "1-0"
      },
      "starting_fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "comment": null,
      "nags": [],
      "is_end": false,
      "variations": [
        {
          "move": {
            "uci": "e2e4",
            "san": "e4",
            "from": 12,
            "to": 28,
            "promotion": null
          },
          "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          "comment": null,
          "nags": [],
          "is_end": false,
          "is_mainline": true,
          "variations": [...]
        }
      ],
      "mainline": [
        {"uci": "e2e4", "san": "e4", "fen_after": "..."},
        {"uci": "e7e5", "san": "e5", "fen_after": "..."}
      ],
      "total_nodes": 42
    }
  ]
}
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

**Expected Output:**
```
test-game-node.ts
 Reading games with readGame()  • • •   (3 / 3)
 GameNode navigation methods  • • • • • •   (6 / 6)
 Board state at nodes  • •   (2 / 2)
 Tree modification methods  • • • • • •   (6 / 6)
 NAGs and comments  • • •   (3 / 3)
 Reading multiple games  •   (1 / 1)
 Board class  • • • • • • • •   (8 / 8)
 Move class  • • •   (3 / 3)
 Complex PGN parsing  • •   (2 / 2)

test-python-chess-compat.ts
 Python-chess compatibility tests  • • • • • • • • • • • • • • • • • • • • • • •   (23 / 23)
 Tree structure tests  • • •   (3 / 3)

  Total:     60
  Passed:    60
```

### What Gets Compared

The compatibility tests verify:

| Property | Description |
|----------|-------------|
| Mainline length | Same number of mainline moves |
| Move UCI | Each move has correct UCI notation |
| Position FEN | Board position matches at each node |
| Total nodes | Same number of nodes in tree |
| Headers | PGN tags match |
| Game comment | Root-level comments match |

### Understanding Test Failures

If a test fails, you'll see which aspect differs:

```
FAIL  Python-chess compatibility tests  "should match python-chess for game1"
    game1 game 1: Move 5 UCI mismatch: got e2e4, expected d2d4
```

This means:
- **File:** `game1.pgn`
- **Game:** 1 (first game in file)
- **Issue:** Move 5 has different UCI notation

---

## Adding New Test Files

### Step 1: Add the PGN File

```bash
cp your_game.pgn pgns/
```

### Step 2: Generate Reference

```bash
python3 test/scripts/generate-reference.py
```

### Step 3: Run Tests

```bash
npm test
# The new file will automatically be tested
```

### Testing a Specific PGN Interactively

```typescript
import { readGame } from 'pgn-chess-tree';
import * as fs from 'fs';

const pgn = fs.readFileSync('path/to/game.pgn', 'utf-8');
const game = readGame(pgn);

console.log('Headers:', Object.fromEntries(game.headers));
console.log('Mainline moves:');
for (const node of game.mainline()) {
  console.log(`  ${node.san()} (${node.uci()})`);
}
console.log('Total nodes:', game.countNodes());
```

---

## Troubleshooting

### "No PGN files found"

Make sure PGN files are in the correct location:

```bash
ls pgns/  # Should list .pgn files
```

### "Skipping X: no reference file"

Generate reference files first:

```bash
python3 test/scripts/generate-reference.py
```

### "Skipping X: no PGN file found"

The test can't find the PGN file. The test looks in these locations (in order):
1. `pgns/X.pgn` (project root pgns folder)
2. `test/pgns/X.pgn` (local test folder)

### Move parsing errors

If you see `Failed to parse move: Nf3`, check:
- Is it standard algebraic notation?
- Are there unusual annotations?
- Is the game from a non-standard starting position (FEN header)?

### Python-chess not installed

```bash
# Using virtual environment (recommended)
source venv/bin/activate
pip install chess

# Or global installation
pip3 install chess

# Verify installation
python3 -c "import chess; print(chess.__version__)"
```

### ModuleNotFoundError: No module named 'chess'

Make sure you're using the same Python that has chess installed:

```bash
# If using venv, make sure it's activated
source venv/bin/activate

# Check which python
which python3

# Install for that python
python3 -m pip install chess
```

---

## Quick Reference

### Commands

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run all tests
npm test

# Set up Python venv (first time only)
python3 -m venv venv
source venv/bin/activate
pip install chess

# Generate python-chess reference files
source venv/bin/activate  # if not already activated
python3 test/scripts/generate-reference.py
```

### Directory Structure

```
pgn-chess-tree/
├── pgns/                           # PGN source files
│   ├── game1.pgn
│   ├── game2.pgn
│   └── ...
│
└── test/
    ├── test-game-node.ts          # Unit tests
    ├── test-python-chess-compat.ts # Compatibility tests
    │
    ├── scripts/
    │   └── generate-reference.py   # Reference generator
    │
    └── reference-trees/            # Generated JSON files
        ├── game1.json
        ├── game2.json
        └── ...
```

### Customizing Paths

Edit `test/scripts/generate-reference.py`:

```python
# Change PGN input directory
pgns_dir = project_root / "pgns"  # Modify this

# Change output directory  
output_dir = script_dir.parent / "reference-trees"  # Modify this
```

Edit `test/test-python-chess-compat.ts`:

```typescript
// PGN file lookup locations
const locations = [
  path.join(__dirname, "..", "pgns", `${pgnName}.pgn`),  // Project root pgns folder
  path.join(__dirname, "pgns", `${pgnName}.pgn`),        // Local test folder
];
```


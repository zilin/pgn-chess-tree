/**
 * Tests for the Game/GameNode API (matching python-chess)
 */

import { test, suite } from "uvu";
import assert from "uvu/assert";
import { readGame, readGames, Game, GameNode, Move, Board, WHITE, BLACK } from "../src";

// =============================================================================
// Basic Game Reading
// =============================================================================

const readingGames = suite("Reading games with readGame()");

readingGames("should read a simple game", () => {
  const game = readGame(`
    [Event "Test"]
    [White "Player1"]
    [Black "Player2"]
    [Result "1-0"]
    
    1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0
  `);

  assert.ok(game, "Game should not be null");
  assert.is(game!.headers.get("Event"), "Test");
  assert.is(game!.headers.get("White"), "Player1");
  assert.is(game!.headers.get("Black"), "Player2");
  assert.is(game!.headers.get("Result"), "1-0");
});

readingGames("should return null for empty PGN", () => {
  const game = readGame("");
  assert.is(game, null);
});

readingGames("should read game with variations", () => {
  const game = readGame("1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *");
  
  assert.ok(game);
  assert.is(game!.variations.length, 1); // First move is e4
  
  const e4 = game!.variations[0];
  assert.is(e4.san(), "e4");
  
  // e4 should have two children: e5 (mainline) and c5 (variation)
  assert.is(e4.variations.length, 2);
  assert.is(e4.variations[0].san(), "e5");
  assert.is(e4.variations[1].san(), "c5");
});

readingGames.run();

// =============================================================================
// GameNode Navigation
// =============================================================================

const navigation = suite("GameNode navigation methods");

navigation("isEnd() should identify terminal nodes", () => {
  const game = readGame("1. e4 e5 2. Nf3 *");
  assert.ok(game);
  
  // Root is not end (has children)
  assert.is(game!.isEnd(), false);
  
  // Last move is end
  const lastNode = game!.end();
  assert.is(lastNode.isEnd(), true);
});

navigation("root() should return the game root", () => {
  const game = readGame("1. e4 e5 2. Nf3 *");
  assert.ok(game);
  
  const lastNode = game!.end();
  assert.is(lastNode.root(), game);
});

navigation("mainline() should iterate main moves", () => {
  const game = readGame("1. e4 e5 (1... c5) 2. Nf3 *");
  assert.ok(game);
  
  const moves: string[] = [];
  for (const node of game!.mainline()) {
    const san = node.san();
    if (san) moves.push(san);
  }
  
  assert.equal(moves, ["e4", "e5", "Nf3"]);
});

navigation("mainlineMoves() should iterate moves", () => {
  const game = readGame("1. e4 e5 2. Nf3 *");
  assert.ok(game);
  
  const uciMoves: string[] = [];
  for (const move of game!.mainlineMoves()) {
    uciMoves.push(move.uci());
  }
  
  assert.equal(uciMoves, ["e2e4", "e7e5", "g1f3"]);
});

navigation("isMainline() should identify mainline nodes", () => {
  const game = readGame("1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *");
  assert.ok(game);
  
  // e4 is on mainline
  const e4 = game!.variations[0];
  assert.is(e4.isMainline(), true);
  
  // e5 is on mainline
  const e5 = e4.variations[0];
  assert.is(e5.isMainline(), true);
  
  // c5 is NOT on mainline (it's a variation)
  const c5 = e4.variations[1];
  assert.is(c5.isMainline(), false);
});

navigation("next() should return first variation", () => {
  const game = readGame("1. e4 e5 *");
  assert.ok(game);
  
  const e4 = game!.next();
  assert.ok(e4);
  assert.is(e4!.san(), "e4");
  
  const e5 = e4!.next();
  assert.ok(e5);
  assert.is(e5!.san(), "e5");
  
  // No more moves
  const nothing = e5!.next();
  assert.is(nothing, null);
});

navigation.run();

// =============================================================================
// Board State
// =============================================================================

const boardState = suite("Board state at nodes");

boardState("board() should return correct position", () => {
  const game = readGame("1. e4 e5 2. Nf3 Nc6 *");
  assert.ok(game);
  
  // Starting position at root
  const rootBoard = game!.board();
  assert.is(rootBoard.fen(), "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  
  // After 1. e4
  const e4 = game!.variations[0];
  const afterE4 = e4.board();
  assert.is(afterE4.pieceAt(28)?.symbol(), "P"); // e4 square = 28
  
  // After 1... e5
  const e5 = e4.variations[0];
  const afterE5 = e5.board();
  assert.is(afterE5.pieceAt(36)?.symbol(), "p"); // e5 square = 36
});

boardState("fen() should return FEN string", () => {
  const game = readGame("1. e4 e5 2. Nf3 *");
  assert.ok(game);
  
  const lastNode = game!.end();
  const fen = lastNode.fen();
  
  // Should be position after 1. e4 e5 2. Nf3
  assert.ok(fen.includes("Nf3") === false); // FEN doesn't include move names
  assert.ok(fen.includes("b")); // Black to move
});

boardState.run();

// =============================================================================
// Tree Modification
// =============================================================================

const modification = suite("Tree modification methods");

modification("addVariation() should add a variation", () => {
  const game = new Game();
  
  const e4Move = Move.fromUci("e2e4");
  const e4 = game.addVariation(e4Move);
  
  assert.is(game.variations.length, 1);
  assert.is(e4.move!.uci(), "e2e4");
  assert.is(e4.parent, game);
});

modification("addMainVariation() should add at front", () => {
  const game = new Game();
  
  const d4 = game.addVariation(Move.fromUci("d2d4"));
  const e4 = game.addMainVariation(Move.fromUci("e2e4"));
  
  assert.is(game.variations.length, 2);
  assert.is(game.variations[0], e4);
  assert.is(game.variations[1], d4);
});

modification("addLine() should add multiple moves", () => {
  const game = new Game();
  
  const moves = [
    Move.fromUci("e2e4"),
    Move.fromUci("e7e5"),
    Move.fromUci("g1f3"),
  ];
  
  const lastNode = game.addLine(moves);
  
  // Check the tree was built correctly
  assert.is(game.variations.length, 1);
  assert.is(lastNode.san(), "Nf3");
});

modification("removeVariation() should remove a variation", () => {
  const game = new Game();
  
  const e4 = game.addVariation(Move.fromUci("e2e4"));
  const d4 = game.addVariation(Move.fromUci("d2d4"));
  
  assert.is(game.variations.length, 2);
  
  game.removeVariation(e4);
  
  assert.is(game.variations.length, 1);
  assert.is(game.variations[0], d4);
});

modification("promote() should move variation up", () => {
  const game = readGame("1. e4 e5 (1... c5) (1... d5) *");
  assert.ok(game);
  
  const e4 = game!.variations[0];
  assert.is(e4.variations.length, 3);
  
  // Initially: e5, c5, d5
  assert.is(e4.variations[0].san(), "e5");
  assert.is(e4.variations[1].san(), "c5");
  assert.is(e4.variations[2].san(), "d5");
  
  // Promote d5 (index 2)
  e4.variations[2].promote();
  
  // Now: e5, d5, c5
  assert.is(e4.variations[0].san(), "e5");
  assert.is(e4.variations[1].san(), "d5");
  assert.is(e4.variations[2].san(), "c5");
});

modification("promoteToMain() should make variation the mainline", () => {
  const game = readGame("1. e4 e5 (1... c5) *");
  assert.ok(game);
  
  const e4 = game!.variations[0];
  const c5 = e4.variations[1];
  
  c5.promoteToMain();
  
  assert.is(e4.variations[0].san(), "c5");
  assert.is(e4.variations[1].san(), "e5");
});

modification.run();

// =============================================================================
// NAGs and Comments
// =============================================================================

const annotations = suite("NAGs and comments");

annotations("should read NAGs from PGN", () => {
  const game = readGame("1. e4! e5?? 2. Nf3 *");
  assert.ok(game);
  
  const e4 = game!.variations[0];
  assert.ok(e4.nags.has(1)); // $1 = !
  
  const e5 = e4.variations[0];
  assert.ok(e5.nags.has(4)); // $4 = ??
});

annotations("should read comments from PGN", () => {
  const game = readGame("1. e4 { Great move! } e5 *");
  assert.ok(game);
  
  const e4 = game!.variations[0];
  assert.ok(e4.comment.includes("Great move"));
});

annotations("should read starting comments", () => {
  const game = readGame("{ Before first move } 1. e4 *");
  assert.ok(game);
  
  // Game comment is on the root
  assert.ok(game!.comment.includes("Before first move"));
});

annotations.run();

// =============================================================================
// Multiple Games
// =============================================================================

const multipleGames = suite("Reading multiple games");

multipleGames("readGames() should read multiple games", () => {
  const pgn = `
    [Event "Game 1"]
    1. e4 *
    
    [Event "Game 2"]
    1. d4 *
  `;
  
  const games = readGames(pgn);
  
  assert.is(games.length, 2);
  assert.is(games[0].headers.get("Event"), "Game 1");
  assert.is(games[1].headers.get("Event"), "Game 2");
});

multipleGames.run();

// =============================================================================
// Board Class
// =============================================================================

const boardTests = suite("Board class");

boardTests("should parse FEN correctly", () => {
  const board = new Board();
  assert.is(board.turn, WHITE);
  
  const boardBlack = new Board("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
  assert.is(boardBlack.turn, BLACK);
});

boardTests("push() should apply moves", () => {
  const board = new Board();
  const move = Move.fromUci("e2e4");
  
  board.push(move);
  
  assert.is(board.pieceAt(28)?.symbol(), "P"); // e4
  assert.is(board.pieceAt(12), null); // e2 is empty
  assert.is(board.turn, BLACK);
});

boardTests("pop() should undo moves", () => {
  const board = new Board();
  const startingFen = board.fen();
  
  board.push(Move.fromUci("e2e4"));
  board.pop();
  
  assert.is(board.fen(), startingFen);
});

boardTests("san() should generate correct notation", () => {
  const board = new Board();
  
  const e4 = Move.fromUci("e2e4");
  assert.is(board.san(e4), "e4");
  
  const nf3 = Move.fromUci("g1f3");
  assert.is(board.san(nf3), "Nf3");
});

boardTests("parseSan() should parse moves correctly", () => {
  const board = new Board();
  
  const e4 = board.parseSan("e4");
  assert.is(e4.uci(), "e2e4");
  
  const nf3 = board.parseSan("Nf3");
  assert.is(nf3.uci(), "g1f3");
});

boardTests("isCheck() should detect check", () => {
  // Position with black king in check
  const board = new Board("rnbqkbnr/ppppp1pp/5p2/8/8/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1");
  board.push(Move.fromUci("d1h5"));
  
  assert.is(board.isCheck(), true);
});

boardTests("isCheckmate() should detect checkmate", () => {
  // Fool's mate position
  const board = new Board();
  board.pushSan("f3");
  board.pushSan("e5");
  board.pushSan("g4");
  board.pushSan("Qh4");
  
  assert.is(board.isCheckmate(), true);
});

boardTests("legalMoves() should generate legal moves", () => {
  const board = new Board();
  
  const moves = [...board.legalMoves()];
  
  // Starting position has 20 legal moves
  assert.is(moves.length, 20);
});

boardTests.run();

// =============================================================================
// Move Class
// =============================================================================

const moveTests = suite("Move class");

moveTests("fromUci() should parse UCI strings", () => {
  const e4 = Move.fromUci("e2e4");
  assert.is(e4.fromSquare, 12); // e2
  assert.is(e4.toSquare, 28); // e4
  assert.is(e4.promotion, null);
  
  const promo = Move.fromUci("e7e8q");
  assert.is(promo.promotion, 5); // QUEEN
});

moveTests("uci() should generate UCI string", () => {
  const move = new Move(12, 28);
  assert.is(move.uci(), "e2e4");
  
  const promo = new Move(52, 60, 5); // e7e8 with queen promotion
  assert.is(promo.uci(), "e7e8q");
});

moveTests("equals() should compare moves", () => {
  const m1 = Move.fromUci("e2e4");
  const m2 = Move.fromUci("e2e4");
  const m3 = Move.fromUci("d2d4");
  
  assert.is(m1.equals(m2), true);
  assert.is(m1.equals(m3), false);
});

moveTests.run();

// =============================================================================
// Complex PGN Parsing
// =============================================================================

const complexPgn = suite("Complex PGN parsing");

complexPgn("should handle deeply nested variations", () => {
  const pgn = `
    1. e4 e5 (1... c5 2. Nf3 (2. d4 cxd4) d6) 2. Nf3 Nc6 
    (2... Nf6 3. Nxe5 (3. Bc4 Nxe4)) 3. Bb5 *
  `;
  
  const game = readGame(pgn);
  assert.ok(game);
  
  // Count all nodes
  const nodeCount = game!.countNodes();
  assert.ok(nodeCount > 5);
  
  // Verify structure
  const e4 = game!.variations[0];
  assert.is(e4.variations.length, 2);
  
  const c5 = e4.variations[1];
  assert.is(c5.variations.length, 2);
});

complexPgn("should handle games with FEN", () => {
  const pgn = `
    [FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]
    [SetUp "1"]
    
    3. Bb5 a6 4. Ba4 Nf6 *
  `;
  
  const game = readGame(pgn);
  assert.ok(game);
  
  // Board should start from the FEN position
  const board = game!.board();
  assert.is(board.turn, WHITE);
  assert.is(board.fullmoveNumber, 3);
});

complexPgn.run();


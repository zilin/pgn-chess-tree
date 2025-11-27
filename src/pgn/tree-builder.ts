/**
 * Tree builder - converts the existing ParseTree output to the new Game tree.
 */

import { Board, Move, parseSquare, QUEEN, ROOK, BISHOP, KNIGHT } from '../chess';
import type { ParseTree } from '@mliebelt/pgn-parser';
import type { PgnMove } from '@mliebelt/pgn-types';
import { Game, GameError } from './game';
import { GameNode } from './game-node';

/**
 * Build a Game tree from a ParseTree (from the existing PEG parser).
 */
export function buildGameTree(parseTree: ParseTree): Game {
  const game = new Game();

  // Copy headers
  if (parseTree.tags) {
    for (const [key, value] of Object.entries(parseTree.tags)) {
      if (key !== 'messages' && typeof value === 'string') {
        game.headers.set(key, value);
      }
    }
  }

  // Copy game comment (comment before first move)
  if (parseTree.gameComment) {
    game.comment = parseTree.gameComment.comment ?? '';
    
    // Extract arrows and shapes from game comment
    if (parseTree.gameComment.colorArrows) {
      game.arrows = parseArrows(parseTree.gameComment.colorArrows);
    }
    if (parseTree.gameComment.colorFields) {
      game.shapes = parseShapes(parseTree.gameComment.colorFields);
    }
  }

  // Get starting position
  const startingFen = game.headers.get('FEN');
  const board = new Board(startingFen);

  // Build the move tree
  if (parseTree.moves && parseTree.moves.length > 0) {
    buildMoveTree(game, parseTree.moves, board, game.errors);
  }

  return game;
}

/**
 * Recursively build the move tree from an array of PgnMove objects.
 * 
 * IMPORTANT: In the original pgn-parser, variations are attached to the move
 * that has variations. But in python-chess, variations branch from the PREVIOUS
 * move (the parent node). We need to handle this difference correctly.
 * 
 * Example: "1. e4 e5 (1... c5) 2. Nf3"
 * - Original parser: e5 has variations: [[c5]]
 * - Python-chess tree: e4 has children [e5, c5], where c5 is a sibling of e5
 */
function buildMoveTree(
  parentNode: GameNode,
  moves: PgnMove[],
  board: Board,
  errors: GameError[],
  parentBoardFen?: string  // FEN of the parent's board (for variations)
): void {
  let currentNode = parentNode;
  let currentBoard = board.copy();
  // Track the FEN BEFORE each move for variation processing
  let fenBeforeCurrentMove = parentBoardFen ?? board.fen();

  for (const pgnMove of moves) {
    // Skip result strings (they appear as string in the moves array)
    if (typeof pgnMove === 'string') {
      continue;
    }

    // Parse the move
    let move: Move;
    try {
      move = parseMove(pgnMove, currentBoard);
    } catch (e) {
      errors.push({
        message: `Failed to parse move: ${pgnMove.notation?.notation ?? 'unknown'}`,
        san: pgnMove.notation?.notation,
        fen: currentBoard.fen(),
      });
      // Try to continue with remaining moves
      continue;
    }

    // Create the new node
    const newNode = new GameNode();
    newNode.parent = currentNode;
    newNode.move = move;

    // Copy annotations
    if (pgnMove.commentMove) {
      newNode.startingComment = pgnMove.commentMove;
    }
    if (pgnMove.commentAfter) {
      newNode.comment = pgnMove.commentAfter;
    }
    if (pgnMove.nag) {
      for (const nag of pgnMove.nag) {
        const nagNum = parseInt(nag.replace('$', ''));
        if (!isNaN(nagNum)) {
          newNode.nags.add(nagNum);
        }
      }
    }

    // Extract clock, eval, arrows, shapes from commentDiag
    if (pgnMove.commentDiag) {
      if (pgnMove.commentDiag.clk) {
        newNode.clock = parseClockTime(pgnMove.commentDiag.clk);
      }
      if (pgnMove.commentDiag.eval !== undefined) {
        const evalValue = pgnMove.commentDiag.eval;
        newNode.eval = typeof evalValue === 'number' ? evalValue : parseFloat(String(evalValue));
      }
      if (pgnMove.commentDiag.colorArrows) {
        newNode.arrows = parseArrows(pgnMove.commentDiag.colorArrows);
      }
      if (pgnMove.commentDiag.colorFields) {
        newNode.shapes = parseShapes(pgnMove.commentDiag.colorFields);
      }
    }

    // Add to parent's variations
    currentNode.variations.push(newNode);

    // Save FEN before applying the move (for variations that branch from here)
    const fenBeforeThisMove = currentBoard.fen();

    // Apply the move to the board
    currentBoard.push(move);

    // Process variations (sidelines)
    // In the original parser, variations are attached to THIS move (pgnMove.variations)
    // But in python-chess tree, variations branch from the PARENT node
    // So we add them as siblings of newNode (children of currentNode)
    if (pgnMove.variations && pgnMove.variations.length > 0) {
      for (const variationMoves of pgnMove.variations) {
        if (variationMoves && variationMoves.length > 0) {
          // Build variation from the position BEFORE this move was made
          // Use FEN to create a fresh board (since copy() doesn't preserve move stack)
          const varBoard = new Board(fenBeforeThisMove);
          buildMoveTree(currentNode, variationMoves, varBoard, errors, fenBeforeThisMove);
        }
      }
    }

    // Update FEN tracking for the next iteration
    fenBeforeCurrentMove = fenBeforeThisMove;

    // Move to the next node for the mainline
    currentNode = newNode;
  }
}

/**
 * Parse a PgnMove notation to a Move object.
 */
function parseMove(pgnMove: PgnMove, board: Board): Move {
  const notation = pgnMove.notation;
  if (!notation) {
    throw new Error('Move has no notation');
  }

  // Handle null move
  if (notation.notation === 'Z0' || notation.notation === '--') {
    return Move.null();
  }

  // Handle castling
  if (notation.notation === 'O-O' || notation.notation === '0-0') {
    return board.parseSan('O-O');
  }
  if (notation.notation === 'O-O-O' || notation.notation === '0-0-0') {
    return board.parseSan('O-O-O');
  }

  // Handle drop (Crazyhouse)
  if (notation.drop) {
    const toSquare = parseSquare(notation.col + notation.row);
    if (toSquare === null) {
      throw new Error(`Invalid drop square: ${notation.col}${notation.row}`);
    }
    const pieceType = { 'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6 }[notation.fig ?? 'P'] as 1|2|3|4|5|6;
    return new Move(0, toSquare, null, pieceType);
  }

  // Use the board to parse the move (handles disambiguation properly)
  try {
    return board.parseSan(notation.notation);
  } catch {
    // Fallback: try to construct the move directly from notation fields
    const toSquare = parseSquare(notation.col + notation.row);
    if (toSquare === null) {
      throw new Error(`Invalid target square: ${notation.col}${notation.row}`);
    }

    // Find the piece that can make this move
    for (const move of board.legalMoves()) {
      if (move.toSquare !== toSquare) continue;
      
      const piece = board.pieceAt(move.fromSquare);
      if (!piece) continue;

      // Check piece type matches
      const expectedPiece = notation.fig ? 
        { 'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6 }[notation.fig] : 1;
      if (piece.pieceType !== expectedPiece) continue;

      // Check disambiguation
      if (notation.disc) {
        const file = notation.disc.charCodeAt(0);
        const rank = parseInt(notation.disc);
        
        if (file >= 97 && file <= 104) {  // a-h
          if ((move.fromSquare & 7) !== (file - 97)) continue;
        }
        if (!isNaN(rank) && rank >= 1 && rank <= 8) {
          if ((move.fromSquare >> 3) !== (rank - 1)) continue;
        }
      }

      // Check promotion
      if (notation.promotion) {
        const promPiece = notation.promotion.replace('=', '').toUpperCase();
        const promType = { 'N': KNIGHT, 'B': BISHOP, 'R': ROOK, 'Q': QUEEN }[promPiece];
        if (move.promotion !== promType) continue;
      } else if (move.promotion) {
        continue;
      }

      return move;
    }

    throw new Error(`Could not find legal move for: ${notation.notation}`);
  }
}

/**
 * Parse arrow annotations like ["Ge2e4", "Ra1a8"]
 */
function parseArrows(arrows: string[]): Array<{ color: string; tail: number; head: number }> {
  const result: Array<{ color: string; tail: number; head: number }> = [];
  for (const arrow of arrows) {
    if (arrow.length >= 5) {
      const color = arrow[0];
      const tail = parseSquare(arrow.slice(1, 3));
      const head = parseSquare(arrow.slice(3, 5));
      if (tail !== null && head !== null) {
        result.push({ color, tail, head });
      }
    }
  }
  return result;
}

/**
 * Parse shape/highlight annotations like ["Ge4", "Rd5"]
 */
function parseShapes(shapes: string[]): Array<{ color: string; square: number }> {
  const result: Array<{ color: string; square: number }> = [];
  for (const shape of shapes) {
    if (shape.length >= 3) {
      const color = shape[0];
      const square = parseSquare(shape.slice(1, 3));
      if (square !== null) {
        result.push({ color, square });
      }
    }
  }
  return result;
}

/**
 * Parse clock time string like "1:23:45" to seconds.
 */
function parseClockTime(clock: string): number {
  const parts = clock.split(':').map(p => parseFloat(p));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

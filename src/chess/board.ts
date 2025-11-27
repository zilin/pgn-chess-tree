/**
 * Board class matching python-chess chess.Board
 * 
 * This is a full chess board implementation that can:
 * - Track piece positions
 * - Validate and execute moves
 * - Generate legal moves
 * - Parse and generate SAN/UCI notation
 * - Handle all special rules (castling, en passant, promotion)
 */

import {
  Color, PieceType, Square,
  WHITE, BLACK,
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  STARTING_FEN,
  squareFile, squareRank, squareFromFileRank, squareName, parseSquare,
  SQUARE_NAMES, FILE_NAMES,
  CASTLING_WHITE_KINGSIDE, CASTLING_WHITE_QUEENSIDE,
  CASTLING_BLACK_KINGSIDE, CASTLING_BLACK_QUEENSIDE,
  A1, H1, A8, H8, E1, E8, C1, G1, C8, G8, D1, F1, D8, F8,
} from './types';
import { Move } from './move';
import { Piece } from './piece';

// Attack tables and move generation helpers
const KNIGHT_MOVES = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const KING_MOVES = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

const BISHOP_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_DIRECTIONS = [...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS];

/**
 * Chess board with full game state.
 * Matches python-chess chess.Board class.
 */
export class Board {
  // Piece placement: 64-element array, null for empty squares
  private pieces: (Piece | null)[];
  
  // Game state
  private _turn: Color;
  private _castlingRights: number;
  private _epSquare: Square | null;
  private _halfmoveClock: number;
  private _fullmoveNumber: number;
  
  // Move stack for undo
  private moveStack: { move: Move; capturedPiece: Piece | null; prevState: BoardState }[];

  constructor(fen: string = STARTING_FEN) {
    this.pieces = new Array(64).fill(null);
    this._turn = WHITE;
    this._castlingRights = 0;
    this._epSquare = null;
    this._halfmoveClock = 0;
    this._fullmoveNumber = 1;
    this.moveStack = [];
    
    this.setFen(fen);
  }

  // ==========================================================================
  // Properties (matching python-chess)
  // ==========================================================================

  /** Whose turn: true = white, false = black */
  get turn(): Color {
    return this._turn;
  }

  set turn(value: Color) {
    this._turn = value;
  }

  /** Castling rights as bitmask */
  get castlingRights(): number {
    return this._castlingRights;
  }

  set castlingRights(value: number) {
    this._castlingRights = value;
  }

  /** En passant square, or null */
  get epSquare(): Square | null {
    return this._epSquare;
  }

  set epSquare(value: Square | null) {
    this._epSquare = value;
  }

  /** Halfmove clock (for 50-move rule) */
  get halfmoveClock(): number {
    return this._halfmoveClock;
  }

  set halfmoveClock(value: number) {
    this._halfmoveClock = value;
  }

  /** Fullmove number */
  get fullmoveNumber(): number {
    return this._fullmoveNumber;
  }

  set fullmoveNumber(value: number) {
    this._fullmoveNumber = value;
  }

  // ==========================================================================
  // Piece Access
  // ==========================================================================

  /** Get piece at square, or null. Matches board.piece_at() */
  pieceAt(square: Square): Piece | null {
    return this.pieces[square];
  }

  /** Set piece at square (or null to clear) */
  setPieceAt(square: Square, piece: Piece | null): void {
    this.pieces[square] = piece;
  }

  /** Remove piece at square, returns the removed piece */
  removePieceAt(square: Square): Piece | null {
    const piece = this.pieces[square];
    this.pieces[square] = null;
    return piece;
  }

  /** Find the king square for a color, or null if no king */
  king(color: Color): Square | null {
    for (let sq = 0; sq < 64; sq++) {
      const piece = this.pieces[sq];
      if (piece && piece.pieceType === KING && piece.color === color) {
        return sq;
      }
    }
    return null;
  }

  // ==========================================================================
  // Move Making (matching python-chess)
  // ==========================================================================

  /** Apply a move. Matches board.push() */
  push(move: Move): void {
    // Save state for undo
    const prevState = this.saveState();
    const capturedPiece = this.pieces[move.toSquare];
    
    this.moveStack.push({ move, capturedPiece, prevState });
    
    const piece = this.pieces[move.fromSquare];
    if (!piece) {
      throw new Error(`No piece at ${squareName(move.fromSquare)}`);
    }

    // Handle special moves
    if (piece.pieceType === KING) {
      // Castling
      if (Math.abs(squareFile(move.fromSquare) - squareFile(move.toSquare)) === 2) {
        this.handleCastling(move, piece.color);
        this.updateStateAfterMove(piece, move, null);
        return;
      }
    }

    // En passant capture
    let actualCapture = capturedPiece;
    if (piece.pieceType === PAWN && move.toSquare === this._epSquare) {
      const capturedPawnSquare = move.toSquare + (piece.color === WHITE ? -8 : 8);
      actualCapture = this.pieces[capturedPawnSquare];
      this.pieces[capturedPawnSquare] = null;
    }

    // Move the piece
    this.pieces[move.fromSquare] = null;
    
    // Handle promotion
    if (move.promotion) {
      this.pieces[move.toSquare] = new Piece(move.promotion, piece.color);
    } else {
      this.pieces[move.toSquare] = piece;
    }

    this.updateStateAfterMove(piece, move, actualCapture);
  }

  private handleCastling(move: Move, color: Color): void {
    // Move king
    this.pieces[move.fromSquare] = null;
    this.pieces[move.toSquare] = new Piece(KING, color);

    // Move rook
    if (squareFile(move.toSquare) === 6) {
      // Kingside
      const rookFrom = color === WHITE ? H1 : H8;
      const rookTo = color === WHITE ? F1 : F8;
      this.pieces[rookFrom] = null;
      this.pieces[rookTo] = new Piece(ROOK, color);
    } else {
      // Queenside
      const rookFrom = color === WHITE ? A1 : A8;
      const rookTo = color === WHITE ? D1 : D8;
      this.pieces[rookFrom] = null;
      this.pieces[rookTo] = new Piece(ROOK, color);
    }
  }

  private updateStateAfterMove(piece: Piece, move: Move, captured: Piece | null): void {
    // Update en passant square
    if (piece.pieceType === PAWN && Math.abs(squareRank(move.toSquare) - squareRank(move.fromSquare)) === 2) {
      this._epSquare = (move.fromSquare + move.toSquare) / 2;
    } else {
      this._epSquare = null;
    }

    // Update castling rights
    if (piece.pieceType === KING) {
      if (piece.color === WHITE) {
        this._castlingRights &= ~(CASTLING_WHITE_KINGSIDE | CASTLING_WHITE_QUEENSIDE);
      } else {
        this._castlingRights &= ~(CASTLING_BLACK_KINGSIDE | CASTLING_BLACK_QUEENSIDE);
      }
    }
    if (piece.pieceType === ROOK) {
      if (move.fromSquare === A1) this._castlingRights &= ~CASTLING_WHITE_QUEENSIDE;
      if (move.fromSquare === H1) this._castlingRights &= ~CASTLING_WHITE_KINGSIDE;
      if (move.fromSquare === A8) this._castlingRights &= ~CASTLING_BLACK_QUEENSIDE;
      if (move.fromSquare === H8) this._castlingRights &= ~CASTLING_BLACK_KINGSIDE;
    }
    if (captured && captured.pieceType === ROOK) {
      if (move.toSquare === A1) this._castlingRights &= ~CASTLING_WHITE_QUEENSIDE;
      if (move.toSquare === H1) this._castlingRights &= ~CASTLING_WHITE_KINGSIDE;
      if (move.toSquare === A8) this._castlingRights &= ~CASTLING_BLACK_QUEENSIDE;
      if (move.toSquare === H8) this._castlingRights &= ~CASTLING_BLACK_KINGSIDE;
    }

    // Update halfmove clock
    if (piece.pieceType === PAWN || captured !== null) {
      this._halfmoveClock = 0;
    } else {
      this._halfmoveClock++;
    }

    // Update fullmove number
    if (this._turn === BLACK) {
      this._fullmoveNumber++;
    }

    // Switch turn
    this._turn = !this._turn;
  }

  /** Undo the last move. Matches board.pop() */
  pop(): Move | null {
    const entry = this.moveStack.pop();
    if (!entry) return null;

    this.restoreState(entry.prevState);
    return entry.move;
  }

  /** Parse SAN and apply the move. Matches board.push_san() */
  pushSan(san: string): Move {
    const move = this.parseSan(san);
    this.push(move);
    return move;
  }

  /** Parse UCI and apply the move. Matches board.push_uci() */
  pushUci(uci: string): Move {
    const move = Move.fromUci(uci);
    this.push(move);
    return move;
  }

  // ==========================================================================
  // Move Parsing
  // ==========================================================================

  /** Parse SAN notation to a Move. Matches board.parse_san() */
  parseSan(san: string): Move {
    // Clean up the SAN
    let s = san.replace(/[+#!?]+$/, '').trim();
    
    // Castling
    if (s === 'O-O' || s === '0-0') {
      const from = this._turn === WHITE ? E1 : E8;
      const to = this._turn === WHITE ? G1 : G8;
      return new Move(from, to);
    }
    if (s === 'O-O-O' || s === '0-0-0') {
      const from = this._turn === WHITE ? E1 : E8;
      const to = this._turn === WHITE ? C1 : C8;
      return new Move(from, to);
    }

    // Null move
    if (s === '--' || s === 'Z0') {
      return Move.null();
    }

    // Parse promotion
    let promotion: PieceType | null = null;
    const promMatch = s.match(/=?([QRBN])$/i);
    if (promMatch) {
      const promChar = promMatch[1].toLowerCase();
      promotion = { 'q': QUEEN, 'r': ROOK, 'b': BISHOP, 'n': KNIGHT }[promChar] as PieceType;
      s = s.slice(0, -promMatch[0].length);
    }

    // Parse destination square (last 2 characters)
    const toName = s.slice(-2);
    const toSquare = parseSquare(toName);
    if (toSquare === null) {
      throw new Error(`Invalid SAN: ${san}`);
    }
    s = s.slice(0, -2);

    // Remove capture marker
    s = s.replace(/x/i, '');

    // Parse piece type
    let pieceType: PieceType = PAWN;
    if (s.length > 0 && /[KQRBN]/.test(s[0])) {
      pieceType = { 'K': KING, 'Q': QUEEN, 'R': ROOK, 'B': BISHOP, 'N': KNIGHT }[s[0]] as PieceType;
      s = s.slice(1);
    }

    // Parse disambiguation (file and/or rank)
    let disambigFile: number | null = null;
    let disambigRank: number | null = null;
    for (const c of s) {
      if (c >= 'a' && c <= 'h') {
        disambigFile = c.charCodeAt(0) - 'a'.charCodeAt(0);
      } else if (c >= '1' && c <= '8') {
        disambigRank = parseInt(c) - 1;
      }
    }

    // Find the matching legal move
    for (const move of this.legalMoves()) {
      const fromPiece = this.pieces[move.fromSquare];
      if (!fromPiece) continue;
      if (fromPiece.pieceType !== pieceType) continue;
      if (move.toSquare !== toSquare) continue;
      if (move.promotion !== promotion) continue;
      
      if (disambigFile !== null && squareFile(move.fromSquare) !== disambigFile) continue;
      if (disambigRank !== null && squareRank(move.fromSquare) !== disambigRank) continue;

      return move;
    }

    throw new Error(`Illegal move: ${san}`);
  }

  /** Parse UCI notation to a Move. Matches board.parse_uci() */
  parseUci(uci: string): Move {
    return Move.fromUci(uci);
  }

  /** Get SAN for a move. Matches board.san() */
  san(move: Move): string {
    const piece = this.pieces[move.fromSquare];
    if (!piece) {
      throw new Error(`No piece at ${squareName(move.fromSquare)}`);
    }

    // Castling
    if (piece.pieceType === KING) {
      const fileDiff = squareFile(move.toSquare) - squareFile(move.fromSquare);
      if (fileDiff === 2) return 'O-O';
      if (fileDiff === -2) return 'O-O-O';
    }

    let san = '';
    
    // Piece letter
    if (piece.pieceType !== PAWN) {
      san += ['', '', 'N', 'B', 'R', 'Q', 'K'][piece.pieceType];
    }

    // Disambiguation
    if (piece.pieceType !== PAWN) {
      let needFile = false;
      let needRank = false;
      
      for (const otherMove of this.legalMoves()) {
        if (otherMove.toSquare !== move.toSquare) continue;
        if (otherMove.fromSquare === move.fromSquare) continue;
        const otherPiece = this.pieces[otherMove.fromSquare];
        if (!otherPiece || otherPiece.pieceType !== piece.pieceType) continue;
        
        if (squareFile(otherMove.fromSquare) === squareFile(move.fromSquare)) {
          needRank = true;
        } else {
          needFile = true;
        }
      }
      
      if (needFile) san += FILE_NAMES[squareFile(move.fromSquare)];
      if (needRank) san += (squareRank(move.fromSquare) + 1).toString();
    }

    // Capture
    const isCapture = this.pieces[move.toSquare] !== null ||
                      (piece.pieceType === PAWN && move.toSquare === this._epSquare);
    if (isCapture) {
      if (piece.pieceType === PAWN) {
        san += FILE_NAMES[squareFile(move.fromSquare)];
      }
      san += 'x';
    }

    // Destination
    san += squareName(move.toSquare);

    // Promotion
    if (move.promotion) {
      san += '=' + ['', '', 'N', 'B', 'R', 'Q'][move.promotion];
    }

    // Check/checkmate
    const boardCopy = this.copy();
    boardCopy.push(move);
    if (boardCopy.isCheck()) {
      san += boardCopy.isCheckmate() ? '#' : '+';
    }

    return san;
  }

  /** Get UCI for a move. Matches move.uci() */
  uci(move: Move): string {
    return move.uci();
  }

  // ==========================================================================
  // Legal Move Generation
  // ==========================================================================

  /** Generate all legal moves. Matches board.legal_moves */
  *legalMoves(): IterableIterator<Move> {
    for (const move of this.pseudoLegalMoves()) {
      if (this.isLegalMove(move)) {
        yield move;
      }
    }
  }

  /** Generate pseudo-legal moves (before checking if king is left in check) */
  *pseudoLegalMoves(): IterableIterator<Move> {
    const color = this._turn;

    for (let fromSq = 0; fromSq < 64; fromSq++) {
      const piece = this.pieces[fromSq];
      if (!piece || piece.color !== color) continue;

      switch (piece.pieceType) {
        case PAWN:
          yield* this.generatePawnMoves(fromSq, color);
          break;
        case KNIGHT:
          yield* this.generateKnightMoves(fromSq, color);
          break;
        case BISHOP:
          yield* this.generateSlidingMoves(fromSq, color, BISHOP_DIRECTIONS);
          break;
        case ROOK:
          yield* this.generateSlidingMoves(fromSq, color, ROOK_DIRECTIONS);
          break;
        case QUEEN:
          yield* this.generateSlidingMoves(fromSq, color, QUEEN_DIRECTIONS);
          break;
        case KING:
          yield* this.generateKingMoves(fromSq, color);
          break;
      }
    }
  }

  private *generatePawnMoves(fromSq: Square, color: Color): IterableIterator<Move> {
    const file = squareFile(fromSq);
    const rank = squareRank(fromSq);
    const direction = color === WHITE ? 1 : -1;
    const startRank = color === WHITE ? 1 : 6;
    const promotionRank = color === WHITE ? 7 : 0;

    // Single push
    const toSq = squareFromFileRank(file, rank + direction);
    if (this.pieces[toSq] === null) {
      if (rank + direction === promotionRank) {
        yield* this.generatePromotions(fromSq, toSq);
      } else {
        yield new Move(fromSq, toSq);
        
        // Double push
        if (rank === startRank) {
          const toSq2 = squareFromFileRank(file, rank + 2 * direction);
          if (this.pieces[toSq2] === null) {
            yield new Move(fromSq, toSq2);
          }
        }
      }
    }

    // Captures
    for (const df of [-1, 1]) {
      const captureFile = file + df;
      if (captureFile < 0 || captureFile > 7) continue;
      
      const captureSq = squareFromFileRank(captureFile, rank + direction);
      const targetPiece = this.pieces[captureSq];
      
      const isCapture = (targetPiece && targetPiece.color !== color) ||
                        captureSq === this._epSquare;
      
      if (isCapture) {
        if (rank + direction === promotionRank) {
          yield* this.generatePromotions(fromSq, captureSq);
        } else {
          yield new Move(fromSq, captureSq);
        }
      }
    }
  }

  private *generatePromotions(fromSq: Square, toSq: Square): IterableIterator<Move> {
    yield new Move(fromSq, toSq, QUEEN);
    yield new Move(fromSq, toSq, ROOK);
    yield new Move(fromSq, toSq, BISHOP);
    yield new Move(fromSq, toSq, KNIGHT);
  }

  private *generateKnightMoves(fromSq: Square, color: Color): IterableIterator<Move> {
    const file = squareFile(fromSq);
    const rank = squareRank(fromSq);

    for (const [df, dr] of KNIGHT_MOVES) {
      const toFile = file + df;
      const toRank = rank + dr;
      if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) continue;

      const toSq = squareFromFileRank(toFile, toRank);
      const targetPiece = this.pieces[toSq];
      if (!targetPiece || targetPiece.color !== color) {
        yield new Move(fromSq, toSq);
      }
    }
  }

  private *generateSlidingMoves(
    fromSq: Square,
    color: Color,
    directions: number[][]
  ): IterableIterator<Move> {
    const file = squareFile(fromSq);
    const rank = squareRank(fromSq);

    for (const [df, dr] of directions) {
      for (let dist = 1; dist < 8; dist++) {
        const toFile = file + df * dist;
        const toRank = rank + dr * dist;
        if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) break;

        const toSq = squareFromFileRank(toFile, toRank);
        const targetPiece = this.pieces[toSq];

        if (!targetPiece) {
          yield new Move(fromSq, toSq);
        } else {
          if (targetPiece.color !== color) {
            yield new Move(fromSq, toSq);
          }
          break;
        }
      }
    }
  }

  private *generateKingMoves(fromSq: Square, color: Color): IterableIterator<Move> {
    const file = squareFile(fromSq);
    const rank = squareRank(fromSq);

    // Normal moves
    for (const [df, dr] of KING_MOVES) {
      const toFile = file + df;
      const toRank = rank + dr;
      if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) continue;

      const toSq = squareFromFileRank(toFile, toRank);
      const targetPiece = this.pieces[toSq];
      if (!targetPiece || targetPiece.color !== color) {
        yield new Move(fromSq, toSq);
      }
    }

    // Castling
    if (color === WHITE && fromSq === E1) {
      if ((this._castlingRights & CASTLING_WHITE_KINGSIDE) && 
          !this.pieces[F1] && !this.pieces[G1]) {
        if (!this.isAttacked(E1, BLACK) && !this.isAttacked(F1, BLACK)) {
          yield new Move(E1, G1);
        }
      }
      if ((this._castlingRights & CASTLING_WHITE_QUEENSIDE) &&
          !this.pieces[D1] && !this.pieces[C1] && !this.pieces[squareFromFileRank(1, 0)]) {
        if (!this.isAttacked(E1, BLACK) && !this.isAttacked(D1, BLACK)) {
          yield new Move(E1, C1);
        }
      }
    } else if (color === BLACK && fromSq === E8) {
      if ((this._castlingRights & CASTLING_BLACK_KINGSIDE) &&
          !this.pieces[F8] && !this.pieces[G8]) {
        if (!this.isAttacked(E8, WHITE) && !this.isAttacked(F8, WHITE)) {
          yield new Move(E8, G8);
        }
      }
      if ((this._castlingRights & CASTLING_BLACK_QUEENSIDE) &&
          !this.pieces[D8] && !this.pieces[C8] && !this.pieces[squareFromFileRank(1, 7)]) {
        if (!this.isAttacked(E8, WHITE) && !this.isAttacked(D8, WHITE)) {
          yield new Move(E8, C8);
        }
      }
    }
  }

  /** Check if a move is legal */
  isLegal(move: Move): boolean {
    return this.isLegalMove(move);
  }

  private isLegalMove(move: Move): boolean {
    // Make the move on a copy
    const copy = this.copy();
    try {
      copy.push(move);
    } catch {
      return false;
    }
    
    // Check if the moving side's king is in check
    const kingSq = copy.king(!copy._turn);  // The side that just moved
    if (kingSq !== null && copy.isAttacked(kingSq, copy._turn)) {
      return false;
    }
    
    return true;
  }

  /** Check if a square is attacked by a color */
  isAttacked(square: Square, byColor: Color): boolean {
    const file = squareFile(square);
    const rank = squareRank(square);

    // Knight attacks
    for (const [df, dr] of KNIGHT_MOVES) {
      const fromFile = file + df;
      const fromRank = rank + dr;
      if (fromFile >= 0 && fromFile <= 7 && fromRank >= 0 && fromRank <= 7) {
        const fromSq = squareFromFileRank(fromFile, fromRank);
        const piece = this.pieces[fromSq];
        if (piece && piece.pieceType === KNIGHT && piece.color === byColor) {
          return true;
        }
      }
    }

    // King attacks
    for (const [df, dr] of KING_MOVES) {
      const fromFile = file + df;
      const fromRank = rank + dr;
      if (fromFile >= 0 && fromFile <= 7 && fromRank >= 0 && fromRank <= 7) {
        const fromSq = squareFromFileRank(fromFile, fromRank);
        const piece = this.pieces[fromSq];
        if (piece && piece.pieceType === KING && piece.color === byColor) {
          return true;
        }
      }
    }

    // Pawn attacks
    const pawnRank = byColor === WHITE ? rank - 1 : rank + 1;
    if (pawnRank >= 0 && pawnRank <= 7) {
      for (const df of [-1, 1]) {
        const pawnFile = file + df;
        if (pawnFile >= 0 && pawnFile <= 7) {
          const fromSq = squareFromFileRank(pawnFile, pawnRank);
          const piece = this.pieces[fromSq];
          if (piece && piece.pieceType === PAWN && piece.color === byColor) {
            return true;
          }
        }
      }
    }

    // Sliding piece attacks (bishop, rook, queen)
    for (const [df, dr] of QUEEN_DIRECTIONS) {
      for (let dist = 1; dist < 8; dist++) {
        const fromFile = file + df * dist;
        const fromRank = rank + dr * dist;
        if (fromFile < 0 || fromFile > 7 || fromRank < 0 || fromRank > 7) break;

        const fromSq = squareFromFileRank(fromFile, fromRank);
        const piece = this.pieces[fromSq];
        if (piece) {
          if (piece.color === byColor) {
            const isDiagonal = df !== 0 && dr !== 0;
            const isStraight = df === 0 || dr === 0;
            
            if (piece.pieceType === QUEEN) return true;
            if (piece.pieceType === BISHOP && isDiagonal) return true;
            if (piece.pieceType === ROOK && isStraight) return true;
          }
          break;
        }
      }
    }

    return false;
  }

  // ==========================================================================
  // Position Queries (matching python-chess)
  // ==========================================================================

  /** Is the current player in check? Matches board.is_check() */
  isCheck(): boolean {
    const kingSq = this.king(this._turn);
    return kingSq !== null && this.isAttacked(kingSq, !this._turn);
  }

  /** Is it checkmate? Matches board.is_checkmate() */
  isCheckmate(): boolean {
    if (!this.isCheck()) return false;
    for (const _ of this.legalMoves()) {
      return false;  // Has at least one legal move
    }
    return true;
  }

  /** Is it stalemate? Matches board.is_stalemate() */
  isStalemate(): boolean {
    if (this.isCheck()) return false;
    for (const _ of this.legalMoves()) {
      return false;
    }
    return true;
  }

  /** Is the game over? Matches board.is_game_over() */
  isGameOver(): boolean {
    // No legal moves
    for (const _ of this.legalMoves()) {
      return this._halfmoveClock >= 100;  // 50-move rule only if has moves
    }
    return true;  // No legal moves = game over
  }

  /** Check if position has insufficient material */
  hasInsufficientMaterial(): boolean {
    // Count pieces
    let whiteBishops = 0, blackBishops = 0;
    let whiteKnights = 0, blackKnights = 0;
    
    for (let sq = 0; sq < 64; sq++) {
      const piece = this.pieces[sq];
      if (!piece) continue;
      if (piece.pieceType === PAWN || piece.pieceType === ROOK || piece.pieceType === QUEEN) {
        return false;
      }
      if (piece.pieceType === BISHOP) {
        if (piece.color === WHITE) whiteBishops++;
        else blackBishops++;
      }
      if (piece.pieceType === KNIGHT) {
        if (piece.color === WHITE) whiteKnights++;
        else blackKnights++;
      }
    }

    // K vs K
    if (whiteBishops + whiteKnights + blackBishops + blackKnights === 0) return true;
    // K+B vs K or K+N vs K
    if (whiteBishops + whiteKnights + blackBishops + blackKnights === 1) return true;
    
    return false;
  }

  // ==========================================================================
  // FEN (matching python-chess)
  // ==========================================================================

  /** Get FEN string. Matches board.fen() */
  fen(): string {
    const parts: string[] = [];

    // Piece placement
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let empty = 0;
      for (let file = 0; file < 8; file++) {
        const piece = this.pieces[squareFromFileRank(file, rank)];
        if (piece) {
          if (empty > 0) {
            row += empty.toString();
            empty = 0;
          }
          row += piece.symbol();
        } else {
          empty++;
        }
      }
      if (empty > 0) row += empty.toString();
      rows.push(row);
    }
    parts.push(rows.join('/'));

    // Active color
    parts.push(this._turn === WHITE ? 'w' : 'b');

    // Castling rights
    let castling = '';
    if (this._castlingRights & CASTLING_WHITE_KINGSIDE) castling += 'K';
    if (this._castlingRights & CASTLING_WHITE_QUEENSIDE) castling += 'Q';
    if (this._castlingRights & CASTLING_BLACK_KINGSIDE) castling += 'k';
    if (this._castlingRights & CASTLING_BLACK_QUEENSIDE) castling += 'q';
    parts.push(castling || '-');

    // En passant
    parts.push(this._epSquare !== null ? squareName(this._epSquare) : '-');

    // Halfmove clock
    parts.push(this._halfmoveClock.toString());

    // Fullmove number
    parts.push(this._fullmoveNumber.toString());

    return parts.join(' ');
  }

  /** Set position from FEN. Matches board.set_fen() */
  setFen(fen: string): void {
    const parts = fen.split(/\s+/);
    if (parts.length < 1) {
      throw new Error(`Invalid FEN: ${fen}`);
    }

    // Clear the board
    this.pieces.fill(null);
    this.moveStack = [];

    // Parse piece placement
    const rows = parts[0].split('/');
    if (rows.length !== 8) {
      throw new Error(`Invalid FEN: ${fen}`);
    }

    for (let rank = 7; rank >= 0; rank--) {
      const row = rows[7 - rank];
      let file = 0;
      for (const c of row) {
        if (c >= '1' && c <= '8') {
          file += parseInt(c);
        } else {
          const piece = Piece.fromSymbol(c);
          this.pieces[squareFromFileRank(file, rank)] = piece;
          file++;
        }
      }
    }

    // Active color
    this._turn = parts.length > 1 && parts[1] === 'b' ? BLACK : WHITE;

    // Castling rights
    this._castlingRights = 0;
    if (parts.length > 2 && parts[2] !== '-') {
      for (const c of parts[2]) {
        if (c === 'K') this._castlingRights |= CASTLING_WHITE_KINGSIDE;
        if (c === 'Q') this._castlingRights |= CASTLING_WHITE_QUEENSIDE;
        if (c === 'k') this._castlingRights |= CASTLING_BLACK_KINGSIDE;
        if (c === 'q') this._castlingRights |= CASTLING_BLACK_QUEENSIDE;
      }
    }

    // En passant
    this._epSquare = null;
    if (parts.length > 3 && parts[3] !== '-') {
      this._epSquare = parseSquare(parts[3]);
    }

    // Halfmove clock
    this._halfmoveClock = parts.length > 4 ? parseInt(parts[4]) || 0 : 0;

    // Fullmove number
    this._fullmoveNumber = parts.length > 5 ? parseInt(parts[5]) || 1 : 1;
  }

  // ==========================================================================
  // Copying and State
  // ==========================================================================

  /** Create a copy. Matches board.copy() */
  copy(): Board {
    const copy = new Board();
    copy.pieces = [...this.pieces];
    copy._turn = this._turn;
    copy._castlingRights = this._castlingRights;
    copy._epSquare = this._epSquare;
    copy._halfmoveClock = this._halfmoveClock;
    copy._fullmoveNumber = this._fullmoveNumber;
    // Don't copy move stack
    return copy;
  }

  private saveState(): BoardState {
    return {
      turn: this._turn,
      castlingRights: this._castlingRights,
      epSquare: this._epSquare,
      halfmoveClock: this._halfmoveClock,
      fullmoveNumber: this._fullmoveNumber,
      pieces: [...this.pieces],
    };
  }

  private restoreState(state: BoardState): void {
    this._turn = state.turn;
    this._castlingRights = state.castlingRights;
    this._epSquare = state.epSquare;
    this._halfmoveClock = state.halfmoveClock;
    this._fullmoveNumber = state.fullmoveNumber;
    this.pieces = [...state.pieces];
  }

  /** Clear the board */
  clear(): void {
    this.pieces.fill(null);
    this._turn = WHITE;
    this._castlingRights = 0;
    this._epSquare = null;
    this._halfmoveClock = 0;
    this._fullmoveNumber = 1;
    this.moveStack = [];
  }

  /** Reset to starting position */
  reset(): void {
    this.setFen(STARTING_FEN);
  }

  /** String representation of the board */
  toString(): string {
    const lines: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let line = '';
      for (let file = 0; file < 8; file++) {
        const piece = this.pieces[squareFromFileRank(file, rank)];
        line += piece ? piece.symbol() : '.';
        line += ' ';
      }
      lines.push(line);
    }
    return lines.join('\n');
  }
}

interface BoardState {
  turn: Color;
  castlingRights: number;
  epSquare: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  pieces: (Piece | null)[];
}


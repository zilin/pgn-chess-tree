/**
 * Headers class for PGN game headers/tags.
 * Matches python-chess game.headers behavior.
 */

/** Standard Seven Tag Roster tags */
export const STR_TAGS = [
  'Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'
] as const;

/**
 * PGN game headers - a Map-like container for PGN tags.
 * Matches python-chess game.headers behavior.
 */
export class Headers implements Iterable<[string, string]> {
  private _tags: Map<string, string>;

  constructor(headers?: Record<string, string> | Map<string, string> | Iterable<[string, string]>) {
    this._tags = new Map();
    
    if (headers) {
      if (headers instanceof Map) {
        for (const [key, value] of headers) {
          this._tags.set(key, value);
        }
      } else if (Symbol.iterator in Object(headers)) {
        for (const [key, value] of headers as Iterable<[string, string]>) {
          this._tags.set(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(headers)) {
          this._tags.set(key, value);
        }
      }
    }
  }

  /** Get a header value. Matches game.headers["Key"] */
  get(key: string): string | undefined {
    return this._tags.get(key);
  }

  /** Set a header value. Matches game.headers["Key"] = value */
  set(key: string, value: string): void {
    this._tags.set(key, value);
  }

  /** Check if a header exists */
  has(key: string): boolean {
    return this._tags.has(key);
  }

  /** Delete a header */
  delete(key: string): boolean {
    return this._tags.delete(key);
  }

  /** Get all header keys */
  keys(): IterableIterator<string> {
    return this._tags.keys();
  }

  /** Get all header values */
  values(): IterableIterator<string> {
    return this._tags.values();
  }

  /** Get all header entries */
  entries(): IterableIterator<[string, string]> {
    return this._tags.entries();
  }

  /** Iterate over headers */
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this._tags[Symbol.iterator]();
  }

  /** Number of headers */
  get size(): number {
    return this._tags.size;
  }

  /** Convert to plain object */
  toObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [key, value] of this._tags) {
      obj[key] = value;
    }
    return obj;
  }

  /** Create a copy */
  copy(): Headers {
    return new Headers(this._tags);
  }

  /** Clear all headers */
  clear(): void {
    this._tags.clear();
  }

  // Standard accessors for common tags

  get event(): string | undefined { return this.get('Event'); }
  set event(value: string | undefined) { if (value !== undefined) this.set('Event', value); else this.delete('Event'); }

  get site(): string | undefined { return this.get('Site'); }
  set site(value: string | undefined) { if (value !== undefined) this.set('Site', value); else this.delete('Site'); }

  get date(): string | undefined { return this.get('Date'); }
  set date(value: string | undefined) { if (value !== undefined) this.set('Date', value); else this.delete('Date'); }

  get round(): string | undefined { return this.get('Round'); }
  set round(value: string | undefined) { if (value !== undefined) this.set('Round', value); else this.delete('Round'); }

  get white(): string | undefined { return this.get('White'); }
  set white(value: string | undefined) { if (value !== undefined) this.set('White', value); else this.delete('White'); }

  get black(): string | undefined { return this.get('Black'); }
  set black(value: string | undefined) { if (value !== undefined) this.set('Black', value); else this.delete('Black'); }

  get result(): string | undefined { return this.get('Result'); }
  set result(value: string | undefined) { if (value !== undefined) this.set('Result', value); else this.delete('Result'); }

  /** Get FEN if present (for games from a position) */
  get fen(): string | undefined { return this.get('FEN'); }
  set fen(value: string | undefined) { if (value !== undefined) this.set('FEN', value); else this.delete('FEN'); }
}


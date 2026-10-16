/** Raised when a money or quantity invariant is violated (non-integer, unsafe, overflow). */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

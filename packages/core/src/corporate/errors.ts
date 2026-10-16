/** Raised for malformed or unsupported corporate actions (for example mergers). */
export class CorporateActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporateActionError';
  }
}

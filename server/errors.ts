export class CatalogConfigurationError extends Error {
  readonly reason: string;
  constructor(message: string, reason: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogConfigurationError';
    this.reason = reason;
  }
}

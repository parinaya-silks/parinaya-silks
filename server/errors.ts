export class CatalogConfigurationError extends Error {
  readonly reason: string;
  constructor(message: string, reason: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogConfigurationError';
    this.reason = reason;
  }
}
export type ReportingQuery = `${'status'|'cod-due'}-${'aggregate'|'count'}-${'all-dates'|'date-range'}`;

// Static query shape only: never retain request bodies, date values or customers.
export class ReportingQueryError extends Error {
  constructor(readonly reportQuery:ReportingQuery,cause:unknown) {
    super('Reporting query failed.',{cause});
    this.name='ReportingQueryError';
  }
}

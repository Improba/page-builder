export type PageBuilderErrorCode =
  | 'INVALID_PAGE_DATA'
  | 'INVALID_NODE'
  | 'INVALID_SNAPSHOT'
  | 'MISSING_COMPONENT'
  | 'DUPLICATE_COMPONENT'
  | 'RENDER_FAILURE'
  | 'UNKNOWN';

export interface PageBuilderErrorOptions {
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class PageBuilderError extends Error {
  readonly code: PageBuilderErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: PageBuilderErrorCode, message: string, options: PageBuilderErrorOptions = {}) {
    super(message);
    this.name = 'PageBuilderError';
    this.code = code;
    this.details = options.details ?? {};
    this.cause = options.cause;
  }
}

export function isPageBuilderError(error: unknown): error is PageBuilderError {
  return error instanceof PageBuilderError;
}

export function createPageBuilderError(
  code: PageBuilderErrorCode,
  message: string,
  options: PageBuilderErrorOptions = {},
): PageBuilderError {
  return new PageBuilderError(code, message, options);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function reportDevDiagnostic(
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) return;
  const normalized = isPageBuilderError(error)
    ? error
    : createPageBuilderError('UNKNOWN', toErrorMessage(error), {
        cause: error,
        details,
      });

  const mergedDetails = details
    ? {
        ...normalized.details,
        ...details,
      }
    : normalized.details;

  console.error(`[PageBuilder][${context}] ${normalized.message}`, {
    code: normalized.code,
    details: mergedDetails,
    cause: normalized.cause,
  });
}

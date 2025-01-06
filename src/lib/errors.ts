type ErrorWithMessage = {
  message: string;
};

type ErrorWithCode = Error & {
  code: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function unwrapError(error: unknown) {
  return toErrorWithMessage(error).message;
}

export function isErrorWithCode(error: unknown, code?: string): boolean {
  return error instanceof Error && (code ? (error as { code?: string }).code === code : true);
}

export function errorCode(error: unknown, code?: string): ErrorWithCode {
  if (isErrorWithCode(error, code)) {
    return error as ErrorWithCode;
  }
  const newError = new Error(JSON.stringify(error)) as ErrorWithCode;
  newError.code = code ?? "unknown";
  return newError;
}

export const NOTFOUND = "NOTFOUND"; // 404
export const BADREQUEST = "BADREQUEST"; // 400
export const CONFLICT = "CONFLICT"; // 409

export class ConflictError extends Error {
  code = CONFLICT;
  constructor(message: string) {
    super(message);
    this.name = "Conflict";
  }
}

export class BadRequestError extends Error {
  code = BADREQUEST;
  constructor(message: string) {
    super(message);
    this.name = "BadRequest";
  }
}
export class NotFoundError extends Error {
  code = NOTFOUND;
  constructor(message: string) {
    super(message);
    this.name = "NotFound";
  }
}

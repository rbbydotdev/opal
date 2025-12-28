type ErrorWithMessage = {
  message: string;
};

type ErrorWithCode = Error & {
  code: string;
};

export class AbortError extends DOMException {
  constructor(message: string = "Operation aborted") {
    // The second argument automatically makes err.name === "AbortError"
    super(message, "AbortError");
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}
export function isAbortError(error: unknown): error is AbortError {
  if (error && typeof error === "object") {
    const e = error as any;

    // Direct AbortError or cross-realm equivalent
    if ((e instanceof DOMException && e.name === "AbortError") || e.name === "AbortError") {
      return true;
    }

    // If cause or reason is an AbortSignal (or carries AbortError)
    const maybeCause = e.cause ?? e.reason;
    if (maybeCause) {
      if (maybeCause instanceof AbortSignal) return true;
      if (maybeCause.aborted) return true;
      if (maybeCause.name === "AbortError") return true;
    }
  }
  return false;
}

export function coerceError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  } else {
    return new Error(String(error));
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

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

export function isError(
  error: unknown,
  target:
    | Error
    | typeof ApplicationError
    | typeof NotFoundError
    | typeof ConflictError
    | typeof BadGatewayError
    | typeof UnauthorizedError
    | typeof BadRequestError
    | typeof ForbiddenError
    | typeof InternalServerError
    | typeof ServiceUnavailableError
    | typeof GatewayTimeoutError
    | typeof NotImplementedError
    | typeof AggregateApplicationError
    | string
): error is Error & typeof target {
  return (error as typeof target & object)?.name === (typeof target === "string" ? target : target?.name);
}

export function errorCode(error: unknown, code?: string): ErrorWithCode {
  if (isErrorWithCode(error, code)) {
    return error as ErrorWithCode;
  }
  const newError = new Error(typeof error !== "string" ? JSON.stringify(error) : error) as ErrorWithCode;
  newError.code = code ?? "unknown";
  return newError;
}

export class ApplicationError extends Error {
  private navigateTo: string | null = null;
  name = "ApplicationError";
  // message!: string;
  code: number;
  _hint?: string;

  getHint() {
    return this._hint || this.name;
  }
  hint(hint: unknown) {
    if (typeof hint === "undefined") {
      return this._hint || this.name;
    }
    // If hint is already a string, use it directly to avoid JSON.stringify quotes
    this._hint = typeof hint === "string" ? hint : unwrapError(hint);
    return this;
  }
  setNavigateTo(path: string) {
    this.navigateTo = path;
    return this;
  }
  getNavigateTo() {
    return this.navigateTo;
  }

  constructor(errorOrMessage: Error | string = "application error", code: number = 500) {
    let message: string;
    let originalStack: string | undefined;

    if (typeof errorOrMessage === "string") {
      message = errorOrMessage;
    } else {
      message = errorOrMessage.message;
      originalStack = errorOrMessage.stack;
    }

    super(message);
    this.code = code;

    // Preserve the original stack trace if given an Error object
    if (originalStack) {
      this.stack = `${this.name}: ${message}\n${originalStack.split("\n").slice(1).join("\n")}`;
    }

    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

export class NotFoundError extends ApplicationError {
  name = "NotFoundError" as const;
  constructor(
    errorOrMessage: Error | string = "not found",
    public path?: string
  ) {
    super(errorOrMessage, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends ApplicationError {
  name = "ConflictError";
  constructor(errorOrMessage: Error | string = "conflict") {
    super(errorOrMessage, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

class BadGatewayError extends ApplicationError {
  name = "BadGatewayError";
  constructor(errorOrMessage: Error | string = "bad gateway") {
    super(errorOrMessage, 502);
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

export class TokenExpiredError extends ApplicationError {
  name = "TokenExpiredError";
  constructor(errorOrMessage: Error | string = "token expired") {
    super(errorOrMessage, 401);
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

class UnauthorizedError extends ApplicationError {
  name = "UnauthorizedError";
  constructor(errorOrMessage: Error | string = "unauthorized") {
    super(errorOrMessage, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class BadRequestError extends ApplicationError {
  name = "BadRequestError";
  constructor(errorOrMessage: Error | string = "bad request") {
    super(errorOrMessage, 400);
    // Minor suggestion applied: added setPrototypeOf for consistency
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnprocessableContentError extends ApplicationError {
  name = "UnprocessableEntityError";
  constructor(errorOrMessage: Error | string = "unprocessable content") {
    super(errorOrMessage, 422);
    Object.setPrototypeOf(this, UnprocessableContentError.prototype);
  }
}

class ForbiddenError extends ApplicationError {
  name = "ForbiddenError";
  constructor(errorOrMessage: Error | string = "forbidden") {
    super(errorOrMessage, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class InternalServerError extends ApplicationError {
  name = "InternalServerError";
  constructor(errorOrMessage: Error | string = "Internal Server Error") {
    super(errorOrMessage, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class ServiceUnavailableError extends ApplicationError {
  name = "ServiceUnavailableError";
  constructor(errorOrMessage: Error | string = "Service Unavailable") {
    super(errorOrMessage, 503);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

class GatewayTimeoutError extends ApplicationError {
  name = "GatewayTimeoutError";
  constructor(errorOrMessage: Error | string = "Gateway Timeout") {
    super(errorOrMessage, 504);
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

class NotImplementedError extends ApplicationError {
  name = "NotImplementedError";
  constructor(errorOrMessage: Error | string = "Not Implemented") {
    super(errorOrMessage, 501);
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}

/**
 * New AggregateApplicationError class to handle multiple errors at once.
 * It extends ApplicationError to integrate seamlessly with the existing helpers.
 */
class AggregateApplicationError extends ApplicationError {
  name = "AggregateApplicationError";
  public readonly errors: Error[];

  constructor(
    errors: Error[],
    message: string = "Multiple errors occurred",
    code: number = 400 // Often a 400 Bad Request if from user input
  ) {
    // Create a detailed message that summarizes the sub-errors
    const combinedMessage = `${message}: \n${errors.map((e, i) => `  ${i + 1}. ${e.message}`).join("\n")}`;

    super(combinedMessage, code);
    this.errors = errors;

    Object.setPrototypeOf(this, AggregateApplicationError.prototype);
  }
}

// Custom template tag to format errors
export function errF(strings: TemplateStringsArray, ...values: unknown[]): Error {
  const message = strings.reduce((result, str, i) => {
    const value = values[i - 1];
    let formattedValue: object | null | string = "";

    if (value instanceof Error) {
      formattedValue = value.message;
    } else {
      formattedValue = value !== undefined ? value : "";
    }

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return result + formattedValue + str;
  }, "");

  const error = new Error(message);

  // Find the first error in the values to copy the stack from
  const originalError = values.find((value) => value instanceof Error) as Error | undefined;
  if (originalError && originalError.stack) {
    error.stack = originalError.stack;
  }

  return error;
}
type ErrorMappingOptions = {
  code?: number | string;
  name?: string;
  message?: string;
  path?: string;
  errors?: Error[];
};

export function mapToTypedError(error: unknown, options: ErrorMappingOptions = {}): ApplicationError {
  // If it's already an AbortError, return it unchanged
  if (isAbortError(error)) {
    return error as any;
  }
  if (isApplicationError(error)) {
    return error;
  }

  // Try to extract code, name, message from error or options
  const err = toErrorWithMessage(error);
  const code =
    options.code ??
    (typeof (error as any)?.code === "number"
      ? (error as any).code
      : typeof (error as any)?.status === "number"
        ? (error as any).status
        : undefined);
  const name = options.name ?? (typeof (error as any)?.name === "string" ? (error as any).name : undefined);
  const message = options.message ?? err.message ?? name;

  // Map by code (number) if present
  switch (code) {
    case 400:
      return new BadRequestError(message);
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message, options.path);
    case 409:
      return new ConflictError(message);
    case 422:
      return new UnprocessableContentError(message);
    case 429:
      return new ServiceUnavailableError(message);
    case 500:
      return new InternalServerError(message);
    case 501:
      return new NotImplementedError(message);
    case 502:
      return new BadGatewayError(message);
    case 503:
      return new ServiceUnavailableError(message);
    case 504:
      return new GatewayTimeoutError(message);
  }

  // Map by name if present
  switch (name) {
    case "NotFoundError":
      return new NotFoundError(message, options.path);
    case "ConflictError":
      return new ConflictError(message);
    case "BadGatewayError":
      return new BadGatewayError(message);
    case "UnauthorizedError":
      return new UnauthorizedError(message);
    case "BadRequestError":
      return new BadRequestError(message);

    case "UnprocessableContentError":
      return new UnprocessableContentError(message);
    case "ForbiddenError":
      return new ForbiddenError(message);
    case "InternalServerError":
      return new InternalServerError(message);
    case "ServiceUnavailableError":
      return new ServiceUnavailableError(message);
    case "GatewayTimeoutError":
      return new GatewayTimeoutError(message);
    case "NotImplementedError":
      return new NotImplementedError(message);
    case "AggregateApplicationError":
      return new AggregateApplicationError(options.errors ?? [], message, typeof code === "number" ? code : 400);
  }

  //if plain Error or unknown, return generic ApplicationError
  return new ApplicationError(message, typeof code === "number" ? code : 500);
}

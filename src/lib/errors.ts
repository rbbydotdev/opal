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

export function isError(
  error: unknown,
  target:
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
): boolean {
  return ((error as { name: string }).name === target.name) as boolean;
}

export function errorCode(error: unknown, code?: string): ErrorWithCode {
  if (isErrorWithCode(error, code)) {
    return error as ErrorWithCode;
  }
  const newError = new Error(JSON.stringify(error)) as ErrorWithCode;
  newError.code = code ?? "unknown";
  return newError;
}
export class ApplicationError extends Error {
  name = "ApplicationError";
  code: number;
  _hint?: string;

  getHint() {
    return this._hint || this.name;
  }
  hint(hint: unknown) {
    if (typeof hint === "undefined") {
      return this._hint || this.name;
    }
    this._hint = unwrapError(hint);
    return this;
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
  name = "NotFoundError";
  constructor(errorOrMessage: Error | string = "not found", public path?: string) {
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

export class BadGatewayError extends ApplicationError {
  name = "BadGatewayError";
  constructor(errorOrMessage: Error | string = "bad gateway") {
    super(errorOrMessage, 502);
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

export class UnauthorizedError extends ApplicationError {
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
    // Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

export class ForbiddenError extends ApplicationError {
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

export class GatewayTimeoutError extends ApplicationError {
  name = "GatewayTimeoutError";
  constructor(errorOrMessage: Error | string = "Gateway Timeout") {
    super(errorOrMessage, 504);
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

export class NotImplementedError extends ApplicationError {
  name = "NotImplementedError";
  constructor(errorOrMessage: Error | string = "Not Implemented") {
    super(errorOrMessage, 501);
    Object.setPrototypeOf(this, NotImplementedError.prototype);
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

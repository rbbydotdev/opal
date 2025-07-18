import { unwrapError } from "@/lib/errors";

export type IframeImageMessagePayload = {
  mimeType: string;
  blob: Blob;
  type: "IFRAME_IMAGE_MESSAGE";
  editId: number;
};

export type IframeErrorMessagePayload = {
  type: "IFRAME_ERROR_MESSAGE";
  error: string;
};
export type IframeNewImagePayload = {
  type: "IFRAME_NEW_IMAGE";
  editId: number;
};

export type IframeReadyPayload = {
  type: "IFRAME_READY";
};

export function NewIframeReadyPayload(): IframeReadyPayload {
  return {
    type: "IFRAME_READY",
  };
}

export function isIframeReadyMessage(event: MessageEvent<unknown>): event is MessageEvent<IframeReadyPayload> {
  const message = event.data;
  return typeof message === "object" && message !== null && (message as { type?: string }).type === "IFRAME_READY";
}

export function NewIframeNewImagePayload(editId: number): IframeNewImagePayload {
  return {
    type: "IFRAME_NEW_IMAGE",
    editId,
  };
}

export function isIframeNewImageMessage(event: MessageEvent<unknown>): event is MessageEvent<IframeNewImagePayload> {
  const message = event.data;
  return typeof message === "object" && message !== null && (message as { type?: string }).type === "IFRAME_NEW_IMAGE";
}
export function NewIframeErrorMessagePayload(error: string | Error): IframeErrorMessagePayload {
  return {
    type: "IFRAME_ERROR_MESSAGE",
    error: unwrapError(error),
  };
}

export function isIframeErrorMessage(event: MessageEvent<unknown>): event is MessageEvent<IframeErrorMessagePayload> {
  const message = event.data;
  return (
    typeof message === "object" && message !== null && (message as { type?: string }).type === "IFRAME_ERROR_MESSAGE"
  );
}

export function NewIframeImageMessagePayload(blob: Blob, editId: number) {
  return {
    mimeType: blob.type,
    blob: blob,
    type: "IFRAME_IMAGE_MESSAGE",
    editId,
  } satisfies IframeImageMessagePayload;
}

export function isIframeImageMessage(event: MessageEvent<unknown>): event is MessageEvent<IframeImageMessagePayload> {
  const message = event.data;
  return (
    typeof message === "object" && message !== null && (message as { type?: string }).type === "IFRAME_IMAGE_MESSAGE"
  );
}

export type IframeImageDebugPayload = {
  type: "IFRAME_IMAGE_DEBUG";
  message: string;
};
export function NewIframeImageDebugPayload(message: string): IframeImageDebugPayload {
  return {
    type: "IFRAME_IMAGE_DEBUG",
    message,
  };
}
export function isIframeImageDebugMessage(
  event: MessageEvent<unknown>
): event is MessageEvent<IframeImageDebugPayload> {
  const message = event.data;
  return (
    typeof message === "object" && message !== null && (message as { type?: string }).type === "IFRAME_IMAGE_DEBUG"
  );
}

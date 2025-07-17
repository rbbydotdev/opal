export type IframeImageMessagePayload = {
  mimeType: string;
  blob: Blob;
  type: "IFRAME_IMAGE_MESSAGE";
};

export function NewIframeImageMessagePayload(blob: Blob) {
  return {
    mimeType: blob.type,
    blob: blob,
    type: "IFRAME_IMAGE_MESSAGE",
  } satisfies IframeImageMessagePayload;
}

export function isIframeImageMessage(event: MessageEvent<unknown>): event is MessageEvent<IframeImageMessagePayload> {
  const message = event.data;
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: string }).type === "IFRAME_IMAGE_MESSAGE" &&
    typeof (message as IframeImageMessagePayload).mimeType === "string" &&
    (message as IframeImageMessagePayload).blob instanceof Blob
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
    typeof message === "object" &&
    message !== null &&
    (message as { type?: string }).type === "IFRAME_IMAGE_DEBUG" &&
    typeof (message as IframeImageDebugPayload).message === "string"
  );
}

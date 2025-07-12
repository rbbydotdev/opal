/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Mammoth {
  convertToHtml: (input: Input, options?: Options) => Promise<Result>;
  convertToMarkdown: (input: Input, options?: Options) => Promise<Result>;
  extractRawText: (input: Input) => Promise<Result>;
  embedStyleMap: (
    input: Input,
    styleMap: string
  ) => Promise<{
    toArrayBuffer: () => ArrayBuffer;
    toBuffer: () => Buffer;
  }>;
  images: Images;
}

export type Input = NodeJsInput | BrowserInput;

export type NodeJsInput = PathInput | BufferInput;

export interface PathInput {
  path: string;
}

export interface BufferInput {
  buffer: Buffer;
}

export type BrowserInput = ArrayBufferInput;

export interface ArrayBufferInput {
  arrayBuffer: ArrayBuffer;
}

export interface Options {
  styleMap?: string | Array<string>;
  includeEmbeddedStyleMap?: boolean;
  includeDefaultStyleMap?: boolean;
  convertImage?: ImageConverter;
  ignoreEmptyParagraphs?: boolean;
  idPrefix?: string;
  transformDocument?: (element: any) => any;
}

export interface ImageConverter {
  __mammothBrand: "ImageConverter";
}

export interface Image {
  contentType: string;
  readAsArrayBuffer: () => Promise<ArrayBuffer>;
  readAsBase64String: () => Promise<string>;
  readAsBuffer: () => Promise<Buffer>;
  read: {
    (): Promise<ArrayBuffer | Buffer>;
    (encoding: "base64"): Promise<string>;
  };
}

export interface ImageAttributes {
  src: string;
  alt?: string;
  "content-type"?: string;
  width?: string;
  height?: string;
}

export interface Images {
  dataUri: ImageConverter;
  imgElement: (f: (image: Image) => Promise<ImageAttributes>) => ImageConverter;
  inline: (f: (image: Image) => Promise<ImageAttributes>) => ImageConverter;
}

export interface Result {
  value: string;
  messages: Array<Message>;
}

export type Message = Warning | Error;

export interface Warning {
  type: "warning";
  message: string;
}

export interface Error {
  type: "error";
  message: string;
  error: unknown;
}

declare module "mammoth/mammoth.browser" {
  const mammoth: Mammoth;
  export default mammoth;
}

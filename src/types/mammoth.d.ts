declare module "mammoth" {
  // Result message types
  interface MammothMessage {
    type: "warning" | "error";
    message: string;
    error?: unknown;
  }

  interface ConvertResult {
    value: string;
    messages: MammothMessage[];
  }

  // Image handling
  interface Image {
    contentType: string;
    readAsArrayBuffer(): Promise<ArrayBuffer>;
    readAsBase64String(): Promise<string>;
    read: {
      (): Promise<ArrayBuffer>;
      (encoding: "base64"): Promise<string>;
    };
  }

  interface ImageAttributes {
    src: string;
    alt?: string;
    "content-type"?: string;
    width?: string;
    height?: string;
  }

  type ImageHandler = (image: Image) => Promise<ImageAttributes>;

  interface Images {
    imgElement: (handler: ImageHandler) => unknown;
    dataUri: unknown;
    inline: (handler: ImageHandler) => unknown;
  }

  // Options
  interface ConvertToHtmlOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: ReturnType<Images["imgElement"]> | ReturnType<Images["inline"]> | ReturnType<Images["dataUri"]>;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
    transformDocument?: (document: any) => any;
  }

  interface ConvertToMarkdownOptions extends ConvertToHtmlOptions {
    // Same as HTML, but without idPrefix
    idPrefix?: never;
  }

  // Main interface
  interface Mammoth {
    convertToHtml(
      input: ArrayBuffer | { arrayBuffer: ArrayBuffer },
      options?: ConvertToHtmlOptions
    ): Promise<ConvertResult>;
    convertToMarkdown(
      input: ArrayBuffer | { arrayBuffer: ArrayBuffer },
      options?: ConvertToMarkdownOptions
    ): Promise<ConvertResult>;
    extractRawText(input: ArrayBuffer | { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
    images: Images;
  }

  const mammoth: Mammoth;
  export default mammoth;
}

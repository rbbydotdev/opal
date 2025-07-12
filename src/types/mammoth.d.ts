/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "mammoth/mammoth.browser" {
  interface ConvertToHtmlOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: (image: any) => any;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
    transformDocument?: (document: any) => any;
  }

  interface ConvertToMarkdownOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: (image: any) => any;
    ignoreEmptyParagraphs?: boolean;
    transformDocument?: (document: any) => any;
  }

  interface ConvertResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

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
    images: {
      imgElement: (image: any) => any;
      dataUri: (image: any) => any;
    };
  }

  const mammoth: Mammoth;
  export = mammoth;
}

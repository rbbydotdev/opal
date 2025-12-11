export function unwrapContent(
  content: string | Promise<string> | (() => Promise<string>) | (() => string)
): Promise<string> {
  if (typeof content === "string") {
    return Promise.resolve(content);
  } else if (typeof content === "function") {
    return Promise.resolve(content()).then((res) => res);
  } else {
    return content;
  }
}

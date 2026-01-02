import { html } from "@codemirror/lang-html";
import { LanguageSupport } from "@codemirror/language";

/**
 * Liquid language support for CodeMirror 6
 * Uses HTML as the base language with Liquid template syntax recognition
 */
export function liquid(): LanguageSupport {
  return html({
    matchClosingTags: true,
    autoCloseTags: true,
  });
}
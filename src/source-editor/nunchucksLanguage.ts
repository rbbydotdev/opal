import { html } from "@codemirror/lang-html";
import { LanguageSupport } from "@codemirror/language";

/**
 * Nunchucks language support for CodeMirror 6
 * Uses HTML as the base language with Nunchucks template syntax recognition
 */
export function nunchucks(): LanguageSupport {
  return html({
    matchClosingTags: true,
    autoCloseTags: true,
  });
}
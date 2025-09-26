import { html } from "@codemirror/lang-html";
import { LanguageSupport } from "@codemirror/language";

/**
 * Simple EJS language support for CodeMirror 6
 * Uses HTML as the base language with EJS template syntax recognition
 */
export function ejs(): LanguageSupport {
  return html({
    matchClosingTags: true,
    autoCloseTags: true,
  });
}

// Export the default EJS language support
export const ejsLanguage = ejs();
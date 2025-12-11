import { html } from "@codemirror/lang-html";
import { LanguageSupport } from "@codemirror/language";

/**
 * Mustache language support for CodeMirror 6
 * Uses HTML as the base language with Mustache template syntax recognition
 */
export function mustache(): LanguageSupport {
  return html({
    matchClosingTags: true,
    autoCloseTags: true,
  });
}

// Export the default Mustache language support
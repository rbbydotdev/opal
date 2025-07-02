// file: search-controller-extension.ts
import { SearchQuery, closeSearchPanel, findNext, openSearchPanel, setSearchQuery } from "@codemirror/search";
import { EditorSelection, Extension } from "@codemirror/state"; // <-- Import EditorSelection
import { Cell, Realm } from "@mdxeditor/editor";
// Import ViewPlugin and EditorView from @codemirror/view
import { EditorView, ViewPlugin } from "@codemirror/view";

// file: event-bus.ts
type SearchEventPayload = {
  term: string;
};

// A very simple event emitter class
class Emitter<EventMap extends Record<string, unknown>> {
  private listeners: {
    [K in keyof EventMap]?: ((payload: EventMap[K]) => void)[];
  } = {};

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event]!.filter((l) => l !== listener);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event]!.forEach((listener) => listener(payload));
  }
}

// Add a payload type for our new event
type SetCursorPayload = {
  position: number;
};

// Add the new event to our AppEvents type
type AppEvents = {
  search: SearchEventPayload;
  setCursor: SetCursorPayload; // <-- New event
};

// Create a singleton instance to be used throughout the app
export const editorEvents = new Emitter<AppEvents>();
const sourceSearchTerm$ = Cell<null | string>(null);
const sourceCursor$ = Cell<number>(0);

const SearchControllerPluginForRealm = (realm: Realm) =>
  class SearchControllerPlugin {
    private view: EditorView;

    constructor(view: EditorView) {
      this.view = view;
      realm.sub(sourceCursor$, (pos) => {
        this.handleSetCursor(pos);
      });
      realm.sub(sourceSearchTerm$, (term) => {
        this.handleSearch(term);
      });
    }

    // The handler for the 'search' event, defined as an arrow function
    // to preserve the 'this' context.
    private handleSearch = (term: string | null) => {
      if (term === null) {
        return closeSearchPanel(this.view);
      }
      openSearchPanel(this.view);
      // 2. Create and dispatch the search query transaction
      const query = new SearchQuery({ search: term, caseSensitive: false });
      this.view.dispatch({
        effects: setSearchQuery.of(query),
      });

      // 3. Move cursor to the first match
      findNext(this.view);

      // 4. Focus the editor to make the selection visible
      this.view.focus();
    };
    private handleSetCursor = (position: number) => {
      const docLength = this.view.state.doc.length;

      // Clamp the position to be within the document bounds
      const finalPosition = Math.max(0, Math.min(position, docLength));

      this.view.dispatch({
        selection: EditorSelection.cursor(finalPosition),
      });

      // Focus the editor so the user sees the cursor move
      this.view.focus();
    };

    // Clean up the subscription when the editor view is destroyed
    destroy() {}

    // An update method is required for ViewPlugins, but we don't need
    // to do anything on editor updates for this specific feature.
    update() {}
  };

/**
 * Creates a CodeMirror 6 extension that listens for external search commands.
 */
export function createSearchControllerExtension(realm: Realm): Extension {
  // The correct way to create the extension is using ViewPlugin.fromClass
  return ViewPlugin.fromClass(SearchControllerPluginForRealm(realm));
}

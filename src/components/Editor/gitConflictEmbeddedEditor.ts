import { Extension, EditorState } from "@codemirror/state";
import { EditorView, WidgetType } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { createContrastSafeCustomTheme } from "./codeMirrorCustomTheme";
import { ConflictRegion } from "./gitConflictPlugin";

// Widget that contains an embedded CodeMirror editor for conflict content
export class ConflictContentWidget extends WidgetType {
  private editorView: EditorView | null = null;

  constructor(
    private region: ConflictRegion,
    private contentType: 'current' | 'incoming',
    private onContentChange: (regionId: string, contentType: 'current' | 'incoming', newContent: string) => void,
    private getLanguageExtension: (mimeType: string) => Extension | null
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement('div');
    container.className = `conflict-embedded-editor conflict-${this.contentType}`;
    
    const content = this.contentType === 'current' 
      ? this.region.currentContent 
      : this.region.incomingContent;
    
    const label = this.contentType === 'current' 
      ? this.region.startMarker.label || 'HEAD'
      : this.region.endMarker.label || 'incoming';

    // Create header
    const header = document.createElement('div');
    header.className = 'conflict-editor-header';
    header.style.cssText = `
      padding: 4px 8px;
      background: ${this.contentType === 'current' ? 'var(--chart-2)' : 'var(--chart-3)'};
      color: white;
      font-size: 12px;
      font-weight: bold;
      border-radius: 4px 4px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    header.textContent = `${this.contentType === 'current' ? 'Current' : 'Incoming'} (${label})`;

    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.style.cssText = `
      border: 1px solid ${this.contentType === 'current' ? 'var(--chart-2)' : 'var(--chart-3)'};
      border-top: none;
      border-radius: 0 0 4px 4px;
      overflow: hidden;
      background: var(--background);
    `;

    // Set up the embedded editor
    const extensions: Extension[] = [
      basicSetup,
      createContrastSafeCustomTheme(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          this.onContentChange(this.region.id, this.contentType, newContent);
        }
      }),
      EditorView.theme({
        "&": { 
          fontSize: "14px",
          minHeight: "60px",
          maxHeight: "200px"
        },
        ".cm-scroller": { 
          padding: "8px",
          overflowY: "auto"
        },
        ".cm-editor": {
          outline: "none"
        },
        ".cm-focused": {
          outline: "none"
        }
      })
    ];

    // Add language extension if available
    const langExt = this.getLanguageExtension('text/plain'); // You could detect language from file context
    if (langExt) {
      extensions.push(langExt);
    }

    const state = EditorState.create({
      doc: content.text,
      extensions
    });

    this.editorView = new EditorView({
      state,
      parent: editorContainer
    });

    container.append(header, editorContainer);
    
    // Style the main container
    container.style.cssText = `
      margin: 8px 0;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      background: var(--card);
    `;

    return container;
  }

  destroy() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  eq(other: ConflictContentWidget) {
    return this.region.id === other.region.id && this.contentType === other.contentType;
  }

  updateContent(newContent: string) {
    if (this.editorView && this.editorView.state.doc.toString() !== newContent) {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: newContent
        }
      });
    }
  }
}

// Enhanced conflict resolver widget with embedded editors
export class EnhancedConflictResolverWidget extends WidgetType {
  private currentEditor: ConflictContentWidget;
  private incomingEditor: ConflictContentWidget;
  private resolvedContent: { current: string; incoming: string } = {
    current: '',
    incoming: ''
  };

  constructor(
    private region: ConflictRegion,
    private onResolve: (regionId: string, choice: 'current' | 'incoming' | 'both' | 'custom') => void,
    private onContentChange: (regionId: string, contentType: 'current' | 'incoming', newContent: string) => void,
    private getLanguageExtension: (mimeType: string) => Extension | null
  ) {
    super();
    
    this.resolvedContent.current = region.currentContent.text;
    this.resolvedContent.incoming = region.incomingContent.text;
    
    this.currentEditor = new ConflictContentWidget(
      region, 
      'current', 
      this.handleContentChange.bind(this),
      getLanguageExtension
    );
    
    this.incomingEditor = new ConflictContentWidget(
      region, 
      'incoming', 
      this.handleContentChange.bind(this),
      getLanguageExtension
    );
  }

  private handleContentChange = (regionId: string, contentType: 'current' | 'incoming', newContent: string) => {
    this.resolvedContent[contentType] = newContent;
    this.onContentChange(regionId, contentType, newContent);
  };

  toDOM() {
    const container = document.createElement('div');
    container.className = 'enhanced-conflict-resolver';
    container.style.cssText = `
      margin: 16px 0;
      padding: 16px;
      background: var(--card);
      border: 2px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Git Merge Conflict';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: var(--foreground);
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const icon = document.createElement('span');
    icon.textContent = '⚠️';
    title.prepend(icon);

    // Editors container
    const editorsContainer = document.createElement('div');
    editorsContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    `;

    const currentContainer = this.currentEditor.toDOM();
    const incomingContainer = this.incomingEditor.toDOM();
    
    editorsContainer.append(currentContainer, incomingContainer);

    // Action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    `;

    const buttons = [
      { text: 'Accept Current', choice: 'current' as const, color: 'var(--chart-2)' },
      { text: 'Accept Incoming', choice: 'incoming' as const, color: 'var(--chart-3)' },
      { text: 'Accept Both', choice: 'both' as const, color: 'var(--primary)' },
      { text: 'Accept Edited', choice: 'custom' as const, color: 'var(--chart-5)' }
    ];

    buttons.forEach(({ text, choice, color }) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.cssText = `
        padding: 8px 16px;
        background: ${color};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: opacity 0.2s;
      `;
      
      button.addEventListener('mouseover', () => {
        button.style.opacity = '0.8';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.opacity = '1';
      });
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.onResolve(this.region.id, choice);
      });
      
      actionsContainer.appendChild(button);
    });

    container.append(title, editorsContainer, actionsContainer);
    return container;
  }

  destroy() {
    this.currentEditor.destroy();
    this.incomingEditor.destroy();
  }

  eq(other: EnhancedConflictResolverWidget) {
    return this.region.id === other.region.id;
  }

  getResolvedContent() {
    return this.resolvedContent;
  }
}

// Simple conflict resolver widget for inline use
class SimpleConflictResolverWidget extends WidgetType {
  constructor(
    private region: ConflictRegion,
    private onResolve: (regionId: string, choice: 'current' | 'incoming' | 'both' | 'custom') => void
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement('span');
    container.className = 'conflict-resolver-widget';
    container.style.cssText = `
      display: inline-flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin: 0 4px;
      font-size: 11px;
      vertical-align: middle;
    `;

    const buttons = [
      { text: 'Current', choice: 'current' as const, color: 'var(--chart-2)' },
      { text: 'Incoming', choice: 'incoming' as const, color: 'var(--chart-3)' },
      { text: 'Both', choice: 'both' as const, color: 'var(--primary)' }
    ];

    buttons.forEach(({ text, choice, color }) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.cssText = `
        padding: 2px 6px;
        background: ${color};
        color: white;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
      `;
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.onResolve(this.region.id, choice);
      });
      
      container.appendChild(button);
    });

    return container;
  }

  eq(other: SimpleConflictResolverWidget) {
    return this.region.id === other.region.id;
  }
}

// Factory function to create conflict widgets
export function createConflictWidget(
  region: ConflictRegion,
  onResolve: (regionId: string, choice: 'current' | 'incoming' | 'both' | 'custom') => void,
  onContentChange: (regionId: string, contentType: 'current' | 'incoming', newContent: string) => void,
  getLanguageExtension: (mimeType: string) => Extension | null,
  useEmbeddedEditors: boolean = true
): WidgetType {
  if (useEmbeddedEditors) {
    return new EnhancedConflictResolverWidget(region, onResolve, onContentChange, getLanguageExtension);
  } else {
    // Use simple inline resolver widget
    return new SimpleConflictResolverWidget(region, onResolve);
  }
}
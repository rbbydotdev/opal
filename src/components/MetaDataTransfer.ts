/**
 * A payload structure to be stored as a JSON string in the 'text/plain' field.
 * It contains a magic key to identify it and a record for custom mime types.
 */
interface CustomDataPayload {
  __isMetaDataTransfer__: true;
  customData: Record<string, string>;
}

export class MetaDataTransfer {
  // The native DataTransfer object to store standard browser-supported types.
  private dataTransfer: DataTransfer;

  // An in-memory cache for all our custom data types.
  private customData: Record<string, string> = {};

  private static readonly PLAIN_TEXT_TYPE = "text/plain";
  private static readonly MAGIC_KEY = "__isMetaDataTransfer__";

  constructor(dataTransfer: DataTransfer = new DataTransfer()) {
    this.dataTransfer = dataTransfer;
    // On initialization, immediately try to parse any existing text/plain data.
    // This handles cases where a DataTransfer object is passed in from a drop event.
    this.parseAndLoadCustomData();
  }

  // --- Static Factory Method ---

  /**
   * Creates a MetaDataTransfer instance from the browser's ClipboardItems.
   * This correctly handles the asynchronous nature of reading clipboard data.
   */
  static async fromClipboard(clipboardItems: ClipboardItems): Promise<MetaDataTransfer> {
    const mdt = new MetaDataTransfer();

    const processingPromises = Array.from(clipboardItems).flatMap((item) =>
      item.types.map(async (type) => {
        const blob = await item.getType(type);
        if (!blob) return;

        const content = await blob.text();

        // If we find our special text/plain format, we don't just set it.
        // We parse it and populate the custom data types.
        if (type === MetaDataTransfer.PLAIN_TEXT_TYPE && MetaDataTransfer.isPayload(content)) {
          const payload = JSON.parse(content) as CustomDataPayload;
          for (const [customType, data] of Object.entries(payload.customData)) {
            // Use the internal setData to correctly populate the custom cache
            mdt.setData(customType, data);
          }
        } else {
          // For all other types, set them directly.
          mdt.setData(type, content);
        }
      })
    );

    await Promise.all(processingPromises);
    return mdt;
  }

  // --- Core Public API ---

  /**
   * Sets data for a given type. If the type is considered custom,
   * it's stored in the internal JSON payload. Otherwise, it's passed
   * to the native DataTransfer object.
   */
  public setData(type: string, data: string): void {
    if (MetaDataTransfer.isStandardMimeType(type)) {
      this.dataTransfer.setData(type, data);
    } else {
      // This is a custom type. Store it in our cache.
      this.customData[type] = data;
      // Immediately update the 'text/plain' field with the serialized data.
      this.serializeCustomDataToPlainText();
    }
  }

  /**
   * Gets data for a given type. It first checks the native DataTransfer object,
   * then falls back to checking the internal cache for custom types.
   */
  public getData(type: string): string {
    // For standard types, the native object is the source of truth.
    if (MetaDataTransfer.isStandardMimeType(type)) {
      return this.dataTransfer.getData(type);
    }
    // For custom types, our internal cache is the source of truth.
    return this.customData[type] || "";
  }

  public getDataAsJson<T extends object>(type: string): Partial<T> {
    const rawData = this.getData(type);

    if (!rawData) {
      return {} as Partial<T>;
    }

    try {
      // The 'as Partial<T>' cast is safe here because the caller provides the generic type.
      return JSON.parse(rawData) as Partial<T>;
    } catch (error) {
      console.warn(`[MetaDataTransfer] Failed to parse JSON for type "${type}". Returning empty object.`, {
        rawData,
        error,
      });
      return {} as Partial<T>;
    }
  }

  /**
   * Returns a combined list of native types and our custom types.
   */
  public get types(): readonly string[] {
    const nativeTypes = this.dataTransfer.types;
    const customTypes = Object.keys(this.customData);
    // Use a Set to ensure 'text/plain' isn't duplicated if we have custom data.
    return Array.from(new Set([...nativeTypes, ...customTypes]));
  }

  /**
   * Clears all data, both native and custom.
   */
  public clearData(): void {
    this.dataTransfer.clearData();
    this.customData = {};
  }

  // --- Conversion & Utility Methods ---

  /**
   * Generates a ClipboardItem suitable for writing to the clipboard API.
   * It combines native data with the serialized custom data payload.
   */
  public toClipboardItem(): ClipboardItem {
    // Ensure the text/plain field is up-to-date before creating the item.
    this.serializeCustomDataToPlainText();

    const items: Record<string, Blob> = {};
    for (const type of this.dataTransfer.types) {
      const data = this.dataTransfer.getData(type);
      items[type] = new Blob([data], { type });
    }
    return new ClipboardItem(items);
  }

  /**
   * Returns the underlying native DataTransfer object.
   * Useful for drag-and-drop events.
   */
  public toDataTransfer(): DataTransfer {
    // Ensure the text/plain field is up-to-date before handing it off.
    this.serializeCustomDataToPlainText();
    return this.dataTransfer;
  }

  // --- Proxied Properties & Methods ---

  public get effectAllowed(): DataTransfer["effectAllowed"] {
    return this.dataTransfer.effectAllowed;
  }
  public set effectAllowed(value: DataTransfer["effectAllowed"]) {
    this.dataTransfer.effectAllowed = value;
  }
  public get files(): FileList {
    return this.dataTransfer.files;
  }

  // --- Private Helpers ---

  /**
   * Serializes the `customData` cache into a JSON string and writes it
   * to the `text/plain` field of the native DataTransfer object.
   */
  private serializeCustomDataToPlainText(): void {
    if (Object.keys(this.customData).length === 0) {
      // If there's no custom data, we don't need our special payload.
      // Note: This doesn't clear text/plain if it was set by something else.
      return;
    }

    const payload: CustomDataPayload = {
      [MetaDataTransfer.MAGIC_KEY]: true,
      customData: this.customData,
    };
    this.dataTransfer.setData(MetaDataTransfer.PLAIN_TEXT_TYPE, JSON.stringify(payload));
  }

  /**
   * Checks the `text/plain` field for our specific JSON payload.
   * If found, it parses the data and populates the `customData` cache.
   */
  private parseAndLoadCustomData(): void {
    const plainText = this.dataTransfer.getData(MetaDataTransfer.PLAIN_TEXT_TYPE);
    if (MetaDataTransfer.isPayload(plainText)) {
      try {
        const payload = JSON.parse(plainText) as CustomDataPayload;
        // Merge with any existing custom data, just in case.
        this.customData = { ...this.customData, ...payload.customData };
      } catch {
        // The text contained our magic string but wasn't valid JSON. Ignore.
      }
    }
  }

  /**
   * A simple helper to distinguish between standard and custom mime types.
   * Browsers generally only allow a few top-level types for clipboard/drag-drop.
   */
  private static isStandardMimeType(type: string): boolean {
    const lowerType = type.toLowerCase();
    return (
      // Add others as needed
      lowerType.startsWith("text/") || lowerType.startsWith("image/") || lowerType.startsWith("application/json")
    );
  }

  /**
   * A quick check to see if a string might be our custom payload
   * before attempting a full JSON.parse().
   */
  private static isPayload(content: string): boolean {
    // The user's idea of a magic string is a great, fast check.
    return content.includes(`"${MetaDataTransfer.MAGIC_KEY}":true`);
  }
}

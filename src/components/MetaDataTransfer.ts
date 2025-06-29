import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { tryParseCopyNodesPayload } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { stringHasTreeNodeDataTransferType } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
export class MetaDataTransfer {
  private dataTransfer: DataTransfer;
  readonly allowedClipboardTypes: string[] = ["text/plain", "text/html", "image/"];

  static async FromClipboardItems(clipboardItems: ClipboardItems): Promise<MetaDataTransfer> {
    const mdt = new MetaDataTransfer();
    clipboardItems.forEach(async (item) => {
      for (const type of item.types) {
        const blob = await item.getType(type);
        if (blob) {
          mdt.dataTransfer.setData(type, String(await blob.text()));
        } else {
          console.warn(`No data found for type: ${type}`);
        }
      }
    });
    return mdt;
  }
  constructor(dataTransfer: DataTransfer = new DataTransfer()) {
    this.dataTransfer = dataTransfer;
  }
  presentationStyle = "inline";
  async toClipboardItem() {
    const items: Record<string, Blob> = {};
    for (const type of this.dataTransfer.types) {
      if (this.allowedClipboardTypes.some((allowedType) => type.startsWith(allowedType))) {
        items[type] = new Blob([this.dataTransfer.getData(type)], { type });
        continue;
      }
      if (type === INTERNAL_NODE_FILE_TYPE) {
        const data = this.dataTransfer.getData(type);
        if (data) {
          items["text/plain"] = new Blob([data], { type: "text/plain" });
        } else {
          console.warn(`No data found for type: ${type}`);
        }
      }
    }
    return new ClipboardItem(items);
  }
  setData(type: string, data: string) {
    this.dataTransfer.setData(type, data);
  }
  getData(type: string) {
    return this.dataTransfer.getData(type);
  }
  clearData() {
    this.dataTransfer.clearData();
  }
  get types() {
    return this.dataTransfer.types;
  }
  get effectAllowed() {
    return this.dataTransfer.effectAllowed;
  }
  set effectAllowed(
    value: "none" | "copy" | "copyLink" | "copyMove" | "link" | "linkMove" | "move" | "all" | "uninitialized"
  ) {
    this.dataTransfer.effectAllowed = value;
  }
  hasFiles() {
    return this.dataTransfer.files && this.dataTransfer.files.length > 0;
  }
  getFiles() {
    return this.dataTransfer.files || [];
  }
  hasInternalDataType() {
    return stringHasTreeNodeDataTransferType(
      this.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE) || this.dataTransfer.getData("text/plain") || ""
    );
  }
  toInternalDataTransfer() {
    if (!this.hasInternalDataType()) return null;
    if (this.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)) {
      return tryParseCopyNodesPayload(this.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)); // Already in the correct format
    }
    return tryParseCopyNodesPayload(this.dataTransfer.getData("text/plain"));
  }
  toDataTransfer() {
    return this.dataTransfer;
  }
}

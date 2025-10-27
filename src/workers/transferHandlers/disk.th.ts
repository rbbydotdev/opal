import { Disk } from "@/data/disk/Disk";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { DiskJType } from "@/data/DiskType";
import { transferHandlers } from "comlink";

transferHandlers.set("Disk", {
  canHandle: (obj): obj is Disk => obj instanceof Disk,
  serialize: (obj: Disk) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: DiskJType }) => {
    return DiskFromJSON(serialized.value);
  },
});

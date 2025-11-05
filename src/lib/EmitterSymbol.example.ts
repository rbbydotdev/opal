import { CreateSuperTypedEmitterClass, EmitterSymbol, OmniBus } from "./TypeEmitter";

// Example usage of EmitterSymbol for clean, descriptive emitter identification

type DiskEvents = {
  write: { path: string; size: number };
  read: { path: string };
  error: { message: string };
};

class Disk extends CreateSuperTypedEmitterClass<DiskEvents>() {
  static readonly IDENT = Symbol('Disk');
  readonly IIDENT = EmitterSymbol('DiskInstance');
  
  constructor(public readonly name: string) {
    super();
  }
}

// Create some disk instances
const systemDisk = new Disk('System');
const dataDisk = new Disk('Data');
const backupDisk = new Disk('Backup');

// Connect to omnibus with descriptive cleanup
const cleanupSystem = OmniBus.connect(Disk.IDENT, systemDisk);
const cleanupData = OmniBus.connect(Disk.IDENT, dataDisk);
const cleanupBackup = OmniBus.connect(Disk.IDENT, backupDisk);

// Listen to ALL disk events
OmniBus.onType(Disk.IDENT, "write", (payload) => {
  console.log(`📝 A disk wrote to: ${payload.path} (${payload.size} bytes)`);
});

// Listen to specific disk instance
OmniBus.onInstance(systemDisk.IIDENT, "write", (payload) => {
  console.log(`🖥️ System disk specifically wrote: ${payload.path}`);
});

// Demonstrate the descriptive nature of EmitterSymbol
console.log('System disk identifier:', systemDisk.IIDENT.toString());
console.log('Data disk identifier:', dataDisk.IIDENT.toString());
console.log('Backup disk identifier:', backupDisk.IIDENT.toString());

// Emit some events
systemDisk.emit("write", { path: "/system/config.txt", size: 1024 });
dataDisk.emit("write", { path: "/data/file.dat", size: 2048 });
backupDisk.emit("write", { path: "/backup/archive.zip", size: 4096 });

// Clean up when done
setTimeout(() => {
  cleanupSystem();
  cleanupData();
  cleanupBackup();
  console.log('✅ All disks disconnected');
}, 100);
/* eslint-disable @typescript-eslint/no-base-to-string */
import { TestSuite } from "../tests/TestSuite";
import { CreateSuperTypedEmitterClass, EmitterSymbol, OmniBusEmitter } from "./TypeEmitter";

// Test event types
type DiskEvents = {
  write: { path: string; size: number };
  read: { path: string };
  error: { message: string };
};

type NetworkEvents = {
  connect: { host: string };
  disconnect: { reason: string };
};

// Create emitter classes with both class and instance identifiers
class Disk extends CreateSuperTypedEmitterClass<DiskEvents>() {
  static readonly IDENT = Symbol("Disk");
  readonly IIDENT = EmitterSymbol("DiskInstance"); // Symbol-like object for WeakMap/WeakSet compatibility
}

class Network extends CreateSuperTypedEmitterClass<NetworkEvents>() {
  static readonly IDENT = Symbol("Network");
  readonly IIDENT = EmitterSymbol("NetworkInstance"); // Symbol-like object for WeakMap/WeakSet compatibility
}

// Simple test framework

// Test suite
const suite = new TestSuite();

suite.test("should create descriptive EmitterSymbol objects", () => {
  const diskSymbol = EmitterSymbol("DiskInstance");
  const networkSymbol = EmitterSymbol("NetworkInstance");
  const unnamed = EmitterSymbol();

  suite.assert(typeof diskSymbol === "object", "Should return an object");
  suite.assert(Object.isFrozen(diskSymbol), "Should be frozen/immutable");
  suite.assertEqual(diskSymbol.toString(), "EmitterSymbol(DiskInstance)", "Should have descriptive toString");
  suite.assertEqual(networkSymbol.toString(), "EmitterSymbol(NetworkInstance)", "Should have descriptive toString");
  suite.assertEqual(unnamed.toString(), "EmitterSymbol()", "Should handle unnamed symbols");

  // Each call should return a unique object
  const another = EmitterSymbol("DiskInstance");
  suite.assert(diskSymbol !== another, "Should create unique objects even with same description");
});

suite.test("should support flexible connection patterns", () => {
  const omnibus = new OmniBusEmitter();

  // Test 1: Connect with IIDENT (existing pattern)
  const disk1 = new Disk();
  const cleanup1 = omnibus.connect(Disk.IDENT, disk1);

  // Test 2: Connect with explicit instance identifier
  const disk2 = new Disk();
  const customInstanceId = EmitterSymbol("CustomDiskInstance");
  const cleanup2 = omnibus.connect(Disk.IDENT, disk2, customInstanceId);

  // Test 3: Connect without IIDENT (should auto-generate)
  class SimpleDisk extends CreateSuperTypedEmitterClass<DiskEvents>() {
    static readonly IDENT = Symbol("SimpleDisk");
    // No IIDENT property
  }
  const disk3 = new SimpleDisk();
  const cleanup3 = omnibus.connect(SimpleDisk.IDENT, disk3);

  // All should be connected and retrievable
  suite.assert(omnibus.get(disk1.IIDENT) === disk1, "Should retrieve disk1 with its IIDENT");
  suite.assert(omnibus.get(customInstanceId) === disk2, "Should retrieve disk2 with custom instance ID");
  // Note: disk3's auto-generated ID is internal, so we can't easily test retrieval

  // Test class-level listening works for all patterns
  let eventCount = 0;
  omnibus.onType(Disk.IDENT, "write", () => eventCount++);

  disk1.emit("write", { path: "/test1.txt", size: 100 });
  disk2.emit("write", { path: "/test2.txt", size: 200 });

  suite.assertEqual(eventCount, 2, "Should receive events from both disk instances");

  // Test individual disconnection
  cleanup1(); // Should only disconnect disk1
  eventCount = 0;

  disk1.emit("write", { path: "/test1-again.txt", size: 100 }); // Should not trigger
  disk2.emit("write", { path: "/test2-again.txt", size: 200 }); // Should trigger

  suite.assertEqual(eventCount, 1, "Should only receive event from disk2 after disk1 disconnect");

  // Cleanup
  cleanup2();
  cleanup3();
});

suite.test("should handle instance-specific listening with custom instance IDs", () => {
  const omnibus = new OmniBusEmitter();

  const disk1 = new Disk();
  const disk2 = new Disk();

  const customId1 = EmitterSymbol("SpecialDisk1");
  const customId2 = EmitterSymbol("SpecialDisk2");

  omnibus.connect(Disk.IDENT, disk1, customId1);
  omnibus.connect(Disk.IDENT, disk2, customId2);

  const disk1Events: any[] = [];
  const disk2Events: any[] = [];

  // Listen to specific instances using custom IDs
  omnibus.onInstance(customId1, "write", (payload) => disk1Events.push(payload));
  omnibus.onInstance(customId2, "write", (payload) => disk2Events.push(payload));

  // Emit from both
  disk1.emit("write", { path: "/disk1-file.txt", size: 100 });
  disk2.emit("write", { path: "/disk2-file.txt", size: 200 });
  disk1.emit("write", { path: "/disk1-file2.txt", size: 150 });

  suite.assertEqual(disk1Events.length, 2, "Should receive 2 events from disk1");
  suite.assertEqual(disk2Events.length, 1, "Should receive 1 event from disk2");
  suite.assertEqual(disk1Events[0].path, "/disk1-file.txt", "First disk1 event correct");
  suite.assertEqual(disk2Events[0].path, "/disk2-file.txt", "Disk2 event correct");
});

suite.test("should connect multiple instances and return cleanup functions", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();
  const network1 = new Network();

  // Connect instances and get cleanup functions
  const cleanupDisk1 = omnibus.connect(Disk.IDENT, disk1);
  const cleanupDisk2 = omnibus.connect(Disk.IDENT, disk2);
  const cleanupNetwork1 = omnibus.connect(Network.IDENT, network1);

  suite.assert(typeof cleanupDisk1 === "function", "Should return cleanup function for disk1");
  suite.assert(typeof cleanupDisk2 === "function", "Should return cleanup function for disk2");
  suite.assert(typeof cleanupNetwork1 === "function", "Should return cleanup function for network1");

  // Verify instances are connected
  suite.assert(omnibus.get(disk1.IIDENT) === disk1, "Should retrieve disk1 by instance");
  suite.assert(omnibus.get(disk2.IIDENT) === disk2, "Should retrieve disk2 by instance");
  suite.assert(omnibus.get(network1.IIDENT) === network1, "Should retrieve network1 by instance");

  // Test cleanup functions
  cleanupDisk1();
  suite.assert(omnibus.get(disk1.IIDENT) === undefined, "Should disconnect disk1 via cleanup function");
  suite.assert(omnibus.get(disk2.IIDENT) === disk2, "Should still have disk2 connected");
});

suite.test("should listen to events by class type (all instances)", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();
  const disk3 = new Disk();

  omnibus.connect(Disk.IDENT, disk1);
  omnibus.connect(Disk.IDENT, disk2);
  omnibus.connect(Disk.IDENT, disk3);

  const writeEvents: Array<{ path: string; size: number }> = [];

  // Listen to ALL disk write events
  omnibus.onType(Disk.IDENT, "write", (payload) => {
    writeEvents.push(payload);
  });

  // Emit from different disk instances
  disk1.emit("write", { path: "/file1.txt", size: 100 });
  disk2.emit("write", { path: "/file2.txt", size: 200 });
  disk3.emit("write", { path: "/file3.txt", size: 300 });

  suite.assertEqual(writeEvents.length, 3, "Should receive write events from all disk instances");
  suite.assertEqual(writeEvents[0]!.path, "/file1.txt", "First event from disk1");
  suite.assertEqual(writeEvents[1]!.path, "/file2.txt", "Second event from disk2");
  suite.assertEqual(writeEvents[2]!.path, "/file3.txt", "Third event from disk3");
});

suite.test("should listen to events by specific instance", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();

  omnibus.connect(Disk.IDENT, disk1);
  omnibus.connect(Disk.IDENT, disk2);

  const disk1Events: any[] = [];
  const disk2Events: any[] = [];

  // Listen to specific instances
  omnibus.onInstance(disk1.IIDENT, "write", (payload) => disk1Events.push(payload));
  omnibus.onInstance(disk2.IIDENT, "write", (payload) => disk2Events.push(payload));

  // Emit from both disks
  disk1.emit("write", { path: "/disk1-file.txt", size: 100 });
  disk2.emit("write", { path: "/disk2-file.txt", size: 200 });
  disk1.emit("write", { path: "/disk1-file2.txt", size: 150 });

  suite.assertEqual(disk1Events.length, 2, "Should receive 2 events from disk1 only");
  suite.assertEqual(disk2Events.length, 1, "Should receive 1 event from disk2 only");
  suite.assertEqual(disk1Events[0].path, "/disk1-file.txt", "First disk1 event correct");
  suite.assertEqual(disk2Events[0].path, "/disk2-file.txt", "Disk2 event correct");
});

suite.test("should handle granular disconnection", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();
  const disk3 = new Disk();

  omnibus.connect(Disk.IDENT, disk1);
  omnibus.connect(Disk.IDENT, disk2);
  omnibus.connect(Disk.IDENT, disk3);

  let eventCount = 0;
  omnibus.onType(Disk.IDENT, "write", () => eventCount++);

  // All disks should trigger events
  disk1.emit("write", { path: "/test1.txt", size: 100 });
  disk2.emit("write", { path: "/test2.txt", size: 100 });
  disk3.emit("write", { path: "/test3.txt", size: 100 });

  suite.assertEqual(eventCount, 3, "Should receive events from all 3 disks");

  // Disconnect only disk2
  omnibus.disconnect(disk2.IIDENT);

  // Reset counter
  eventCount = 0;

  // Emit again
  disk1.emit("write", { path: "/test1-again.txt", size: 100 });
  disk2.emit("write", { path: "/test2-again.txt", size: 100 }); // Should not trigger
  disk3.emit("write", { path: "/test3-again.txt", size: 100 });

  suite.assertEqual(eventCount, 2, "Should only receive events from disk1 and disk3 after disk2 disconnect");
});

suite.test("should disconnect entire class", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();
  const network1 = new Network();

  omnibus.connect(Disk.IDENT, disk1);
  omnibus.connect(Disk.IDENT, disk2);
  omnibus.connect(Network.IDENT, network1);

  let diskEventCount = 0;
  let networkEventCount = 0;

  omnibus.onType(Disk.IDENT, "write", () => diskEventCount++);
  omnibus.onType(Network.IDENT, "connect", () => networkEventCount++);

  // Test before disconnect
  disk1.emit("write", { path: "/test.txt", size: 100 });
  disk2.emit("write", { path: "/test.txt", size: 100 });
  network1.emit("connect", { host: "localhost" });

  suite.assertEqual(diskEventCount, 2, "Should receive events from both disks");
  suite.assertEqual(networkEventCount, 1, "Should receive network event");

  // Disconnect all disk instances
  omnibus.disconnectClass(Disk.IDENT);

  // Reset counters
  diskEventCount = 0;
  networkEventCount = 0;

  // Test after class disconnect
  disk1.emit("write", { path: "/test.txt", size: 100 }); // Should not trigger
  disk2.emit("write", { path: "/test.txt", size: 100 }); // Should not trigger
  network1.emit("connect", { host: "localhost" }); // Should still trigger

  suite.assertEqual(diskEventCount, 0, "Should not receive disk events after class disconnect");
  suite.assertEqual(networkEventCount, 1, "Should still receive network events");
});

suite.test("should provide class-level queries", () => {
  const omnibus = new OmniBusEmitter();
  const disk1 = new Disk();
  const disk2 = new Disk();
  const disk3 = new Disk();
  const network1 = new Network();

  omnibus.connect(Disk.IDENT, disk1);
  omnibus.connect(Disk.IDENT, disk2);
  omnibus.connect(Disk.IDENT, disk3);
  omnibus.connect(Network.IDENT, network1);

  // Get all disk instances
  const diskInstances = omnibus.getByClass<Disk>(Disk.IDENT);
  const networkInstances = omnibus.getByClass<Network>(Network.IDENT);

  suite.assertEqual(diskInstances.length, 3, "Should return 3 disk instances");
  suite.assertEqual(networkInstances.length, 1, "Should return 1 network instance");

  suite.assert(diskInstances.includes(disk1), "Should include disk1");
  suite.assert(diskInstances.includes(disk2), "Should include disk2");
  suite.assert(diskInstances.includes(disk3), "Should include disk3");
  suite.assert(networkInstances.includes(network1), "Should include network1");

  // Get connected classes
  const connectedClasses = omnibus.getConnectedClasses();
  suite.assertEqual(connectedClasses.length, 2, "Should have 2 connected classes");
  suite.assert(connectedClasses.includes(Disk.IDENT), "Should include Disk class");
  suite.assert(connectedClasses.includes(Network.IDENT), "Should include Network class");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as OmniBusEmitterV2TestSuite };

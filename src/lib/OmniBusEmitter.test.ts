import { OmniBusEmitter, CreateSuperTypedEmitterClass } from "./TypeEmitter";

// Test event types for different emitters
type UserEvents = {
  login: { userId: string };
  logout: { userId: string };
};

type SystemEvents = {
  startup: { version: string };
  shutdown: { reason: string };
};

type FileEvents = {
  created: { path: string };
  deleted: { path: string };
  modified: { path: string; size: number };
};

// Create custom emitter classes with IDENT symbols
class UserEmitter extends CreateSuperTypedEmitterClass<UserEvents>() {
  static readonly IDENT = Symbol('UserEmitter');
}
class SystemEmitter extends CreateSuperTypedEmitterClass<SystemEvents>() {
  static readonly IDENT = Symbol('SystemEmitter');
}
class FileEmitter extends CreateSuperTypedEmitterClass<FileEvents>() {
  static readonly IDENT = Symbol('FileEmitter');
}

// Simple test framework (reusing the same one)
class TestSuite {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: ${message || "Values not equal"}\nExpected: ${expected}\nActual: ${actual}`
      );
    }
  }

  async run() {
    console.log("🧪 Running OmniBusEmitter tests...\n");

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Test suite
const suite = new TestSuite();

suite.test("should connect and retrieve emitters by class", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  const systemEmitter = new SystemEmitter();

  // Connect emitters
  omnibus.connect(UserEmitter, userEmitter);
  omnibus.connect(SystemEmitter, systemEmitter);

  // Retrieve emitters
  const retrievedUser = omnibus.get(UserEmitter);
  const retrievedSystem = omnibus.get(SystemEmitter);
  const nonExistent = omnibus.get(FileEmitter);

  suite.assert(retrievedUser === userEmitter, "Should retrieve the exact UserEmitter instance");
  suite.assert(retrievedSystem === systemEmitter, "Should retrieve the exact SystemEmitter instance");
  suite.assert(nonExistent === undefined, "Should return undefined for non-connected emitter");
});

suite.test("should forward events from connected emitters to omnibus", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  
  // Connect the emitter
  omnibus.connect(UserEmitter, userEmitter);

  const receivedEvents: Array<{ eventName: string; payload: any }> = [];

  // Listen for specific events on omnibus
  omnibus.on("login", (payload) => {
    receivedEvents.push({ eventName: "login", payload });
  });

  omnibus.on("logout", (payload) => {
    receivedEvents.push({ eventName: "logout", payload });
  });

  // Emit events from the connected emitter
  userEmitter.emit("login", { userId: "user123" });
  userEmitter.emit("logout", { userId: "user123" });

  suite.assertEqual(receivedEvents.length, 2, "Should receive both forwarded events");
  suite.assertEqual(receivedEvents[0].eventName, "login", "First event should be login");
  suite.assertEqual(receivedEvents[0].payload.userId, "user123", "Login payload should be correct");
  suite.assertEqual(receivedEvents[1].eventName, "logout", "Second event should be logout");
  suite.assertEqual(receivedEvents[1].payload.userId, "user123", "Logout payload should be correct");
});

suite.test("should handle multiple different emitter types", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  const systemEmitter = new SystemEmitter();
  const fileEmitter = new FileEmitter();

  // Connect all emitters
  omnibus.connect(UserEmitter, userEmitter);
  omnibus.connect(SystemEmitter, systemEmitter);
  omnibus.connect(FileEmitter, fileEmitter);

  const allEvents: Array<{ type: string; data: any }> = [];

  // Listen to different event types on omnibus
  omnibus.on("login", (payload) => allEvents.push({ type: "user-login", data: payload }));
  omnibus.on("startup", (payload) => allEvents.push({ type: "system-startup", data: payload }));
  omnibus.on("created", (payload) => allEvents.push({ type: "file-created", data: payload }));
  omnibus.on("modified", (payload) => allEvents.push({ type: "file-modified", data: payload }));

  // Emit from each emitter
  userEmitter.emit("login", { userId: "bob" });
  systemEmitter.emit("startup", { version: "v1.0.0" });
  fileEmitter.emit("created", { path: "/test.txt" });
  fileEmitter.emit("modified", { path: "/test.txt", size: 1024 });

  suite.assertEqual(allEvents.length, 4, "Should receive events from all emitter types");
  suite.assertEqual(allEvents[0].type, "user-login", "User event received");
  suite.assertEqual(allEvents[1].type, "system-startup", "System event received");
  suite.assertEqual(allEvents[2].type, "file-created", "File created event received");
  suite.assertEqual(allEvents[3].type, "file-modified", "File modified event received");
  suite.assertEqual(allEvents[3].data.size, 1024, "Complex payload preserved");
});

suite.test("should support wildcard listening on omnibus", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  const systemEmitter = new SystemEmitter();

  omnibus.connect(UserEmitter, userEmitter);
  omnibus.connect(SystemEmitter, systemEmitter);

  const wildcardEvents: Array<{ eventName: string; payload: any }> = [];

  // Listen to all events using wildcard
  omnibus.on("*", (payload) => {
    wildcardEvents.push({ 
      eventName: payload.eventName as string, 
      payload: { ...payload, eventName: undefined } // Remove eventName for comparison
    });
  });

  // Emit various events
  userEmitter.emit("login", { userId: "alice" });
  systemEmitter.emit("startup", { version: "v2.0.0" });
  userEmitter.emit("logout", { userId: "alice" });

  suite.assertEqual(wildcardEvents.length, 3, "Should receive all events via wildcard");
  suite.assertEqual(wildcardEvents[0].eventName, "login", "First wildcard event name correct");
  suite.assertEqual(wildcardEvents[0].payload.userId, "alice", "First wildcard payload correct");
  suite.assertEqual(wildcardEvents[1].eventName, "startup", "Second wildcard event name correct");
  suite.assertEqual(wildcardEvents[1].payload.version, "v2.0.0", "Second wildcard payload correct");
  suite.assertEqual(wildcardEvents[2].eventName, "logout", "Third wildcard event name correct");
});

suite.test("should disconnect emitters properly", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  
  omnibus.connect(UserEmitter, userEmitter);
  
  let eventCount = 0;
  omnibus.on("login", () => eventCount++);

  // Emit before disconnect
  userEmitter.emit("login", { userId: "test" });
  suite.assertEqual(eventCount, 1, "Should receive event before disconnect");

  // Disconnect
  omnibus.disconnect(UserEmitter);
  
  // Verify it's disconnected
  const retrieved = omnibus.get(UserEmitter);
  suite.assert(retrieved === undefined, "Should not retrieve disconnected emitter");

  // Emit after disconnect
  userEmitter.emit("login", { userId: "test2" });
  suite.assertEqual(eventCount, 1, "Should not receive events after disconnect");
});

suite.test("should list connected emitters", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  const systemEmitter = new SystemEmitter();

  // Initially empty
  suite.assertEqual(omnibus.getConnectedEmitters().length, 0, "Should start with no connected emitters");

  // Connect emitters
  omnibus.connect(UserEmitter, userEmitter);
  omnibus.connect(SystemEmitter, systemEmitter);

  const connected = omnibus.getConnectedEmitters();
  suite.assertEqual(connected.length, 2, "Should have 2 connected emitters");
  suite.assert(connected.includes(userEmitter), "Should include user emitter");
  suite.assert(connected.includes(systemEmitter), "Should include system emitter");

  // Disconnect one
  omnibus.disconnect(UserEmitter);
  const remaining = omnibus.getConnectedEmitters();
  suite.assertEqual(remaining.length, 1, "Should have 1 emitter after disconnect");
  suite.assert(remaining.includes(systemEmitter), "Should still include system emitter");
  suite.assert(!remaining.includes(userEmitter), "Should not include disconnected user emitter");
});

suite.test("should listen to specific emitter types with onType", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  const systemEmitter = new SystemEmitter();
  const fileEmitter = new FileEmitter();

  omnibus.connect(UserEmitter, userEmitter);
  omnibus.connect(SystemEmitter, systemEmitter);
  omnibus.connect(FileEmitter, fileEmitter);

  const userLoginEvents: any[] = [];
  const systemStartupEvents: any[] = [];
  const fileCreatedEvents: any[] = [];

  // Listen only to specific emitter types
  omnibus.onType(UserEmitter.IDENT, "login", (payload) => userLoginEvents.push(payload));
  omnibus.onType(SystemEmitter.IDENT, "startup", (payload) => systemStartupEvents.push(payload));
  omnibus.onType(FileEmitter.IDENT, "created", (payload) => fileCreatedEvents.push(payload));

  // Emit various events
  userEmitter.emit("login", { userId: "alice" });
  systemEmitter.emit("startup", { version: "v1.0.0" });
  fileEmitter.emit("created", { path: "/test.txt" });
  
  // Also emit events with same names from different emitters
  userEmitter.emit("logout", { userId: "alice" }); // Different event, same emitter
  fileEmitter.emit("deleted", { path: "/test.txt" }); // Different event, different emitter

  // Should only receive events from the specific emitter types
  suite.assertEqual(userLoginEvents.length, 1, "Should receive only user login events");
  suite.assertEqual(systemStartupEvents.length, 1, "Should receive only system startup events");
  suite.assertEqual(fileCreatedEvents.length, 1, "Should receive only file created events");

  suite.assertEqual(userLoginEvents[0].userId, "alice", "User login payload correct");
  suite.assertEqual(systemStartupEvents[0].version, "v1.0.0", "System startup payload correct");
  suite.assertEqual(fileCreatedEvents[0].path, "/test.txt", "File created payload correct");
});

suite.test("should isolate events by emitter type even with same event names", () => {
  const omnibus = new OmniBusEmitter();
  
  // Create events with potential name conflicts
  type ConflictEvents = { 
    update: { data: string; source: string }; 
  };
  
  class EmitterA extends CreateSuperTypedEmitterClass<ConflictEvents>() {
    static readonly IDENT = Symbol('EmitterA');
  }
  class EmitterB extends CreateSuperTypedEmitterClass<ConflictEvents>() {
    static readonly IDENT = Symbol('EmitterB');
  }

  const emitterA = new EmitterA();
  const emitterB = new EmitterB();

  omnibus.connect(EmitterA, emitterA);
  omnibus.connect(EmitterB, emitterB);

  const eventsFromA: any[] = [];
  const eventsFromB: any[] = [];

  // Listen to same event name but from different emitters
  omnibus.onType(EmitterA.IDENT, "update", (payload) => eventsFromA.push(payload));
  omnibus.onType(EmitterB.IDENT, "update", (payload) => eventsFromB.push(payload));

  // Emit same event name from both emitters
  emitterA.emit("update", { data: "from-A", source: "emitterA" });
  emitterB.emit("update", { data: "from-B", source: "emitterB" });
  emitterA.emit("update", { data: "from-A-again", source: "emitterA" });

  suite.assertEqual(eventsFromA.length, 2, "Should receive 2 events from EmitterA");
  suite.assertEqual(eventsFromB.length, 1, "Should receive 1 event from EmitterB");
  
  suite.assertEqual(eventsFromA[0].source, "emitterA", "First A event correct");
  suite.assertEqual(eventsFromA[1].source, "emitterA", "Second A event correct");
  suite.assertEqual(eventsFromB[0].source, "emitterB", "B event correct");
});

suite.test("should clean up onType listeners", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();

  omnibus.connect(UserEmitter, userEmitter);

  let eventCount = 0;
  const cleanup = omnibus.onType(UserEmitter.IDENT, "login", () => eventCount++);

  userEmitter.emit("login", { userId: "test" });
  suite.assertEqual(eventCount, 1, "Should receive event before cleanup");

  cleanup();
  userEmitter.emit("login", { userId: "test2" });
  suite.assertEqual(eventCount, 1, "Should not receive event after cleanup");
});

// Test type safety at compile time
suite.test("should provide type safety for connected emitters", () => {
  const omnibus = new OmniBusEmitter();
  const userEmitter = new UserEmitter();
  
  omnibus.connect(UserEmitter, userEmitter);
  
  // This should be typed correctly
  const retrievedEmitter = omnibus.get(UserEmitter);
  
  // TypeScript should know this is UserEmitter | undefined
  if (retrievedEmitter) {
    // This should be type-safe - TypeScript knows about emit method and event types
    retrievedEmitter.emit("login", { userId: "typed-test" });
    
    // This would be a TypeScript error if uncommented:
    // retrievedEmitter.emit("invalidEvent", { data: "test" });
  }
  
  // The test passes if it compiles without TypeScript errors
  suite.assert(true, "Type safety test passed (compile-time check)");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as OmniBusEmitterTestSuite };
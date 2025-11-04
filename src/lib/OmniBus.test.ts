import { OmniBus } from "./OmniBus";
import { CreateSuperTypedEmitterClass } from "./TypeEmitter";

// Test event types
type TestEvents = {
  message: string;
  data: { count: number };
};

// Test emitter class
class TestEmitter extends CreateSuperTypedEmitterClass<TestEvents>() {
  static readonly IDENT = Symbol('TestEmitter');
}

// Simple test framework
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
    console.log("🧪 Running OmniBus singleton tests...\n");

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

suite.test("should be a singleton - same instance across imports", () => {
  // Multiple accesses should return the same instance
  const omnibus1 = OmniBus;
  const omnibus2 = OmniBus;
  
  suite.assert(omnibus1 === omnibus2, "Should return the same instance");
});

suite.test("should work as a normal OmniBusEmitter", () => {
  const testEmitter = new TestEmitter();
  
  // Connect emitter
  OmniBus.connect(TestEmitter, testEmitter);
  
  // Verify it was connected
  const retrieved = OmniBus.get(TestEmitter);
  suite.assert(retrieved === testEmitter, "Should retrieve the connected emitter");
});

suite.test("should maintain state across multiple accesses", () => {
  const testEmitter = new TestEmitter();
  let eventCount = 0;
  
  // Connect and listen in one "session"
  OmniBus.connect(TestEmitter, testEmitter);
  OmniBus.onType(TestEmitter.IDENT, "message", () => eventCount++);
  
  // Emit from a different "session" (simulating different modules)
  const anotherAccessToOmniBus = OmniBus;
  const retrievedEmitter = anotherAccessToOmniBus.get(TestEmitter);
  
  suite.assert(retrievedEmitter === testEmitter, "Should maintain connected emitters");
  
  // Emit event
  testEmitter.emit("message", "test");
  
  suite.assertEqual(eventCount, 1, "Should maintain listeners across accesses");
});

suite.test("should handle lazy initialization", () => {
  // This test verifies that the proxy works correctly
  // Even though we've used OmniBus before, accessing any method should work
  const connectedEmitters = OmniBus.getConnectedEmitters();
  
  suite.assert(Array.isArray(connectedEmitters), "Should return array of connected emitters");
  suite.assert(connectedEmitters.length > 0, "Should have emitters from previous tests");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as OmniBusTestSuite };
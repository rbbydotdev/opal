import { TestSuite } from "../lib/tests/TestSuite";
import "./Promise";

// Simple test framework

// Test suite
const suite = new TestSuite();

suite.test("should have Promise.obj function", () => {
  suite.assert(typeof (Promise as any).obj === "function", "Promise.obj should be a function");
});

suite.test("should resolve object promises in parallel", async () => {
  const promises = {
    a: Promise.resolve("value a"),
    b: Promise.resolve("value b"),
    c: Promise.resolve("value c"),
  };

  const result = await (Promise as any).obj(promises);

  suite.assertEqual(typeof result, "object", "Result should be an object");
  suite.assertEqual(result.a, "value a", "Should have correct value for key 'a'");
  suite.assertEqual(result.b, "value b", "Should have correct value for key 'b'");
  suite.assertEqual(result.c, "value c", "Should have correct value for key 'c'");
});

suite.test("should resolve with different value types", async () => {
  const promises = {
    string: Promise.resolve("hello"),
    number: Promise.resolve(42),
    boolean: Promise.resolve(true),
    object: Promise.resolve({ nested: "value" }),
    array: Promise.resolve([1, 2, 3]),
  };

  const result = await (Promise as any).obj(promises);

  suite.assertEqual(result.string, "hello", "String value correct");
  suite.assertEqual(result.number, 42, "Number value correct");
  suite.assertEqual(result.boolean, true, "Boolean value correct");
  suite.assertEqual(result.object.nested, "value", "Object value correct");
  suite.assertEqual(result.array.length, 3, "Array value correct");
});

suite.test("should handle mixed resolved and delayed promises", async () => {
  const promises = {
    immediate: Promise.resolve("immediate"),
    delayed: new Promise((resolve) => setTimeout(() => resolve("delayed"), 10)),
  };

  const start = Date.now();
  const result = await (Promise as any).obj(promises);
  const duration = Date.now() - start;

  suite.assertEqual(result.immediate, "immediate", "Immediate value correct");
  suite.assertEqual(result.delayed, "delayed", "Delayed value correct");
  suite.assert(duration < 50, "Should resolve in parallel, not sequentially");
});

suite.test("should reject if any promise rejects", async () => {
  const promises = {
    good: Promise.resolve("success"),
    bad: Promise.reject(new Error("test error")),
  };

  try {
    await (Promise as any).obj(promises);
    suite.assert(false, "Should have thrown an error");
  } catch (error) {
    suite.assertEqual((error as Error).message, "test error", "Should propagate rejection");
  }
});

suite.test("should handle empty object", async () => {
  const result = await (Promise as any).obj({});

  suite.assertEqual(typeof result, "object", "Result should be an object");
  suite.assertEqual(Object.keys(result).length, 0, "Result should be empty");
});

suite.test("should handle non-promise values", async () => {
  const promises = {
    promise: Promise.resolve("from promise"),
    direct: "direct value",
  };

  const result = await (Promise as any).obj(promises);

  suite.assertEqual(result.promise, "from promise", "Promise value correct");
  suite.assertEqual(result.direct, "direct value", "Direct value correct");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as PromisePolyfillTestSuite };

import { TransferHandler, transferHandlers } from "comlink";

interface SerializedAbortSignal {
  port: MessagePort;
}

export const abortSignalTransferHandler: TransferHandler<AbortSignal, SerializedAbortSignal> = {
  // Check if the value is an AbortSignal instance
  canHandle(value: unknown): value is AbortSignal {
    return value instanceof AbortSignal;
  },

  // --- Main Thread Side ---
  // Takes the original AbortSignal and prepares it for transfer
  serialize(signal: AbortSignal): [SerializedAbortSignal, Transferable[]] {
    const channel = new MessageChannel();
    const { port1, port2 } = channel;

    // CRITICAL: Handle signals that are already aborted.
    if (signal.aborted) {
      port1.postMessage("abort");
      port1.close();
    } else {
      // If not aborted, listen for the abort event to fire once.
      signal.addEventListener(
        "abort",
        () => {
          port1.postMessage("abort");
          port1.close(); // Clean up the port
        },
        { once: true } // Use { once: true } for automatic cleanup
      );
    }

    // We send port2 to the worker and mark it as transferable
    return [{ port: port2 }, [port2]];
  },

  // --- Worker Side ---
  // Takes the serialized data and reconstructs a usable AbortSignal
  deserialize(serialized: SerializedAbortSignal): AbortSignal {
    // Create a new controller *inside the worker* to generate a new signal
    const workerController = new AbortController();
    const { port } = serialized;

    // When the main thread sends the 'abort' message,
    // we trigger the abort on our new worker-side controller.
    port.onmessage = () => {
      workerController.abort();
      port.close(); // Clean up the port
    };

    // We return the SIGNAL of the new controller. Your worker code
    // will receive this mirrored signal.
    return workerController.signal;
  },
};

transferHandlers.set("SerializedAbortSignal", abortSignalTransferHandler);

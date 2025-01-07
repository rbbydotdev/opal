"use client";
import Emittery, { type Options } from "emittery";
import { nanoid } from "nanoid";

export class Channel<EventData = Record<string, unknown>> extends Emittery<EventData> {
  private channel: BroadcastChannel | null = null;
  private contextId: string = nanoid();

  constructor(public readonly channelName: string, options?: Options<EventData>) {
    super(options);
    this.createChannel();
  }

  private createChannel() {
    this.channel = new BroadcastChannel(this.channelName);

    this.channel.onmessage = (event) => {
      const { eventData, eventName, senderId } = event.data;
      if (eventName === Emittery.listenerAdded || eventName === Emittery.listenerRemoved) return;
      if (!eventName || senderId === this.contextId) return; // Ignore messages from the same context
      console.debug("bcast incoming:", eventName);
      super.emit(eventName, eventData);
    };
  }

  async emit<Name extends keyof EventData>(
    eventName: Name,
    eventData?: EventData[Name],
    { contextId }: { contextId?: string } = { contextId: this.contextId }
  ): Promise<void> {
    if (eventName === Emittery.listenerAdded || eventName === Emittery.listenerRemoved) return;
    const message = JSON.stringify({ eventName, eventData, senderId: contextId });
    console.debug("bcast outgoing:", eventName);
    try {
      if (this.channel) {
        return this.channel.postMessage(JSON.parse(message));
      } else {
        console.error("Channel is not initialized or has been closed.");
      }
    } catch (e) {
      console.error("Error during postMessage:", e);
    }
  }

  tearDown() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.clearListeners();
  }
}

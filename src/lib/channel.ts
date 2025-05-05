"use client";
import Emittery, { type Options } from "emittery";
import { nanoid } from "nanoid";

const ChannelSet = new Map<string, () => void>();

export class Channel<EventData = Record<string, unknown>> extends Emittery<EventData> {
  private channel: BroadcastChannel | null = null;
  private contextId: string = nanoid();

  constructor(public readonly channelName: string, options?: Options<EventData>) {
    super(options);
  }
  init() {
    if (ChannelSet.has(this.channelName)) {
      console.warn("Channel already exists:" + this.channelName + " ... removing");
      try {
        const close = ChannelSet.get(this.channelName);
        if (close) close();
      } catch (e) {
        console.error("Error during channel teardown:", e);
      }
      ChannelSet.delete(this.channelName);
    }
    ChannelSet.set(this.channelName, this.tearDown);
    return this.createChannel();
  }

  private createChannel() {
    this.channel = new BroadcastChannel(this.channelName);

    this.channel.onmessage = (event) => {
      const { eventData, eventName, senderId } = event.data;
      if (eventName === Emittery.listenerAdded || eventName === Emittery.listenerRemoved) return;
      if (!eventName || senderId === this.contextId) return; // Ignore messages from the same context
      console.debug("bcast incoming:", eventName);
      void super.emit(eventName, eventData);
    };
    return () => {
      this.channel?.close();
      this.channel = null;
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
      //TODO:
      if (this.channel) {
        return this.channel.postMessage(JSON.parse(message));
      } else {
        console.warn("Channel is not initialized or has been closed.");
      }
    } catch (e) {
      console.error("Error during postMessage:", e);
    }
  }

  tearDown = () => {
    ChannelSet.delete(this.channelName);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.clearListeners();
  };
}

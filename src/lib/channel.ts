"use client";
import Emittery, { type Options } from "emittery";
import { nanoid } from "nanoid";

export class Channel<EventData = Record<string, any>> extends Emittery<EventData> {
  private channel: BroadcastChannel;
  private contextId: string = nanoid();
  // static INCLUDE_SELF = { contextId: "self" };

  constructor(public readonly channelName: string, options?: Options<EventData>) {
    super(options);
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      //debug messge
      const { eventData, eventName, senderId } = event.data;
      if (!eventName || senderId === this.contextId) return; // Ignore messages from the same context
      super.emit(eventName, eventData);
    };
  }

  async emit<Name extends keyof EventData>(
    eventName: Name,
    eventData?: EventData[Name],
    { contextId }: { contextId?: string } = { contextId: this.contextId }
  ): Promise<void> {
    const message = JSON.stringify({ eventName, eventData, senderId: contextId });
    super.emit(eventName, eventData as EventData[Name]);
    return this.channel.postMessage(JSON.parse(message));
  }

  closeChannel() {
    this.channel.close();
  }

  tearDown() {
    this.channel.close();
    this.clearListeners();
  }
}

import Emittery, { type Options } from "emittery";
import { nanoid } from "nanoid";

const ChannelSet = new Map<string, Channel>();

export class Channel<EventData = Record<string, unknown>> extends Emittery<EventData> {
  private channel: BroadcastChannel | null = null;
  private contextId: string = nanoid();

  static GetChannel(channelName: string): Channel | undefined {
    return ChannelSet.get(channelName);
  }

  constructor(public readonly channelName: string, options?: Options<EventData>) {
    super(options);
  }
  init() {
    console.debug("channel setup");
    if (ChannelSet.has(this.channelName)) {
      console.warn("Channel already exists:" + this.channelName + " ... removing");
      try {
        const ch = ChannelSet.get(this.channelName);
        if (ch) ch.tearDown();
      } catch (e) {
        console.error("Error during channel tearDown:", e);
      }
      ChannelSet.delete(this.channelName);
    }
    ChannelSet.set(this.channelName, this as Channel);
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
    console.debug("broadcast outgoing:", eventName);
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
    if (typeof window !== "undefined" && window.location) {
      console.log("channel tearDown in " + window.location.href); //TODO:
    } else {
      console.log("channel tearDown (window not available)");
    }
    ChannelSet.delete(this.channelName);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.clearListeners();
  };
}

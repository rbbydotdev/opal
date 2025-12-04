import { SuperEmitter } from "@/lib/events/TypeEmitter";
import { nanoid } from "nanoid";

const ChannelSet = new Map<string, Channel>();

const DEBUG_CHANNELS = false;

export class Channel<EventData extends Record<string, any> = Record<string, unknown>> {
  private emitter: SuperEmitter<EventData>;
  // private listenerAddedSymbol = Symbol("listenerAdded");
  // private listenerRemovedSymbol = Symbol("listenerRemoved");
  private channel: BroadcastChannel | null = null;
  private contextId: string = nanoid();

  static GetChannel(channelName: string): Channel | undefined {
    return ChannelSet.get(channelName);
  }

  constructor(public readonly channelName: string) {
    this.emitter = new SuperEmitter<EventData>();
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
      // if (eventName === this.listenerAddedSymbol || eventName === this.listenerRemovedSymbol) return;
      if (!eventName || senderId === this.contextId) return; // Ignore messages from the same context
      if (DEBUG_CHANNELS) console.debug("bcast incoming:", eventName);
      this.emitter.emit(eventName, eventData);
    };
    return () => {
      this.channel?.close();
      this.channel = null;
    };
  }

  emit<Name extends keyof EventData>(
    eventName: Name,
    eventData?: EventData[Name],
    { contextId }: { contextId?: string } = { contextId: this.contextId }
  ): void {
    // if (eventName === this.listenerAddedSymbol || eventName === this.listenerRemovedSymbol) return;
    const message = JSON.stringify({ eventName, eventData, senderId: contextId });
    if (DEBUG_CHANNELS) console.debug("broadcast outgoing:", eventName);
    try {
      if (this.channel) {
        this.channel.postMessage(JSON.parse(message));
      } else {
        console.warn("Channel is not initialized or has been closed.");
      }
    } catch (e) {
      console.error("Error during postMessage:", e);
    }
  }

  // Delegate Emittery-like methods to the internal emitter
  on<Name extends keyof EventData>(
    eventName: Name | (keyof EventData)[],
    listener: (eventData: EventData[Name]) => void
  ): () => void {
    return this.emitter.on(eventName, listener);
  }

  once<Name extends keyof EventData>(eventName: Name, listener: (eventData: EventData[Name]) => void): () => void {
    return this.emitter.once(eventName, listener);
  }

  off<Name extends keyof EventData>(eventName: Name, listener: (eventData: EventData[Name]) => void): void {
    this.emitter.off(eventName, listener);
  }

  removeListener<Name extends keyof EventData>(eventName: Name, listener: (eventData: EventData[Name]) => void): void {
    this.emitter.removeListener(eventName, listener);
  }

  clearListeners(): void {
    this.emitter.clearListeners();
  }

  awaitEvent<Name extends keyof EventData>(eventName: Name): Promise<EventData[Name]> {
    return this.emitter.awaitEvent(eventName);
  }

  tearDown = () => {
    if (typeof window !== "undefined" && window.location) {
      if (DEBUG_CHANNELS) console.debug("channel tearDown in " + window.location.href); //TODO:
    } else {
      if (DEBUG_CHANNELS) console.debug("channel tearDown (window not available)");
    }
    ChannelSet.delete(this.channelName);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.emitter.clearListeners();
  };
}

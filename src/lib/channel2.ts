"use client";
import { nanoid } from "nanoid";

const ChannelSet = new Set<string>();

export class BroadcastEmitter<EventData = Record<string, unknown>> {
  private channel: BroadcastChannel | null = null;
  private contextId: string = nanoid();
  private listeners: Map<keyof EventData, Set<(eventData: EventData[keyof EventData]) => void>> = new Map();

  constructor(public readonly channelName: string) {
    if (ChannelSet.has(channelName)) {
      throw new Error("Channel already exists: " + channelName);
    }
    ChannelSet.add(channelName);
    this.createChannel();
  }

  private createChannel() {
    this.channel = new BroadcastChannel(this.channelName);

    this.channel.onmessage = (event) => {
      const { eventData, eventName, senderId } = event.data;
      if (!eventName || senderId === this.contextId) return; // Ignore messages from the same context
      console.debug("bcast incoming:", eventName);
      this.emitLocal(eventName, eventData);
    };
  }

  private emitLocal<Name extends keyof EventData>(eventName: Name, eventData: EventData[Name]) {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(eventData);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      }
    }
  }

  emit<Name extends keyof EventData>(eventName: Name, eventData?: EventData[Name]): void {
    if (!this.channel) {
      console.error("Channel is not initialized or has been closed.");
      return;
    }

    const message = { eventName, eventData, senderId: this.contextId };
    console.debug("bcast outgoing:", eventName);
    try {
      this.channel.postMessage(message);
    } catch (e) {
      console.error("Error during postMessage:", e);
    }

    // Emit the event locally as well
    this.emitLocal(eventName, eventData);
  }

  on<Name extends keyof EventData>(eventName: Name, listener: (eventData: EventData[Name]) => void): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);
  }

  off<Name extends keyof EventData>(eventName: Name, listener: (eventData: EventData[Name]) => void): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  tearDown() {
    ChannelSet.delete(this.channelName);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

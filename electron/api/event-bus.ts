import type { ServerResponse } from 'http';

type EventPayload = unknown;
type EventListener = (payload: EventPayload) => void;

export class HostEventBus {
  private readonly clients = new Set<ServerResponse>();
  private readonly listeners = new Map<string, Set<EventListener>>();

  addSseClient(res: ServerResponse): void {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  on(eventName: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(eventName) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
    return () => this.off(eventName, listener);
  }

  off(eventName: string, listener: EventListener): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName: string, payload: EventPayload): void {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch {
        this.clients.delete(client);
      }
    }

    const listeners = this.listeners.get(eventName);
    if (!listeners) return;
    for (const listener of listeners) {
      listener(payload);
    }
  }

  closeAll(): void {
    for (const client of this.clients) {
      try {
        client.end();
      } catch {
        // Ignore individual client close failures.
      }
    }
    this.clients.clear();
    this.listeners.clear();
  }
}

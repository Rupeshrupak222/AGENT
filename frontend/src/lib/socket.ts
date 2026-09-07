import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

// Base WebSocket URL derived from environment or API origin
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(":3000", ":3001")
    : "http://localhost:3001");

class RealtimeSocketClient {
  private socket: Socket | null = null;
  private activeCampaignId: string | null = null;
  private activeCallId: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;

  public getSocket(): Socket | null {
    return this.socket;
  }

  public connect(): Socket | null {
    if (typeof window === "undefined") return null;

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      this.disconnect();
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;

    this.socket = io(`${WS_BASE_URL}/calls`, {
      auth: { token },
      query: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
      // Rejoin active rooms on connect / reconnect
      if (this.activeCampaignId) {
        this.socket?.emit("join:campaign", { campaignId: this.activeCampaignId });
      }
      if (this.activeCallId) {
        this.socket?.emit("join:call", { callId: this.activeCallId });
      }
      this.notify("connection:status", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnecting = false;
      this.notify("connection:status", { connected: false, reason });
    });

    this.socket.on("connect_error", (error) => {
      this.isConnecting = false;
      this.notify("connection:status", { connected: false, error: error.message });
    });

    // Wire global event forwarding
    const events = [
      "campaign:status",
      "campaign:progress",
      "campaign:lead:status",
      "call:status",
      "call:analysis",
      "calls:overview_status",
      "crm:sync:status",
    ];

    for (const evt of events) {
      this.socket.on(evt, (payload: any) => {
        this.notify(evt, payload);
      });
    }

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.activeCampaignId = null;
    this.activeCallId = null;
    this.notify("connection:status", { connected: false });
  }

  public subscribeCampaign(campaignId: string) {
    this.activeCampaignId = campaignId;
    if (this.socket?.connected) {
      this.socket.emit("join:campaign", { campaignId });
    } else {
      this.connect();
    }
  }

  public unsubscribeCampaign(campaignId: string) {
    if (this.activeCampaignId === campaignId) {
      this.activeCampaignId = null;
    }
    if (this.socket?.connected) {
      this.socket.emit("leave:campaign", { campaignId });
    }
  }

  public subscribeCall(callId: string) {
    this.activeCallId = callId;
    if (this.socket?.connected) {
      this.socket.emit("join:call", { callId });
    } else {
      this.connect();
    }
  }

  public unsubscribeCall(callId: string) {
    if (this.activeCallId === callId) {
      this.activeCallId = null;
    }
    if (this.socket?.connected) {
      this.socket.emit("leave:call", { callId });
    }
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error(`Error in realtime socket listener for [${event}]:`, err);
        }
      });
    }
  }
}

export const realtimeSocket = new RealtimeSocketClient();

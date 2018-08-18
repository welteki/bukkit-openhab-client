import * as Websocket from 'ws';
import { EventEmitter } from 'events';
import { URL } from 'url';

enum MessageType {
  PLAYER_MESSAGE = 1,
  SERVER_MESSAGE = 2,
  PLAYER_COMMANDS_MESSAGE = 3,
  SIGN_MESSAGE = 4,
  SIGN_COMMANDS_MESSAGE = 5
}

enum websocketState {
  CONNECTING,
  OPEN,
  CLOSING,
  CLOSED
}

enum websocketCloseStatus {
  WEB_SOCKET_SUCCESS_CLOSE_STATUS = 1000,
  WEB_SOCKET_ENDPOINT_UNAVAILABLE_CLOSE_STATUS = 1001,
  WEB_SOCKET_PROTOCOL_ERROR_CLOSE_STATUS = 1002,
  WEB_SOCKET_INVALID_DATA_TYPE_CLOSE_STATUS = 1003,
  WEB_SOCKET_EMPTY_CLOSE_STATUS = 1005,
  WEB_SOCKET_ABORTED_CLOSE_STATUS = 1006,
  WEB_SOCKET_INVALID_PAYLOAD_CLOSE_STATUS = 1007,
  WEB_SOCKET_POLICY_VIOLATION_CLOSE_STATUS = 1008,
  WEB_SOCKET_MESSAGE_TOO_BIG_CLOSE_STATUS = 1009,
  WEB_SOCKET_UNSUPPORTED_EXTENSIONS_CLOSE_STATUS = 1010,
  WEB_SOCKET_SERVER_ERROR_CLOSE_STATUS = 1011,
  WEB_SOCKET_SECURE_HANDSHAKE_ERROR_CLOSE_STATUS = 1015
}

export interface ClientOptions {
  port?: number;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnects?: number;
}

const DEFAULT_PORT: number = 10692;
const DEFAULT_PATH: string = 'stream';

export class Client extends EventEmitter {
  private options: ClientOptions;
  private url: URL;
  private ws: Websocket;
  private reconnectCount: number = 0;

  constructor(host: string, options?: ClientOptions) {
    super();
    options = options || {};
    options.port = options.port || DEFAULT_PORT;
    options.reconnect = options.reconnect !== false;
    options.reconnectInterval = options.reconnectInterval || 6000;
    this.options = options;

    let wsURL: URL;
    try {
      wsURL = new URL(DEFAULT_PATH, host);
    } catch {
      wsURL = new URL(DEFAULT_PATH, `ws://${host}`);
    }
    wsURL.protocol = 'ws';
    //@ts-ignore
    wsURL.port = wsURL.port ? wsURL.port : this.options.port.toString();
    this.url = wsURL;

    this.connect();
  }

  private connect() {
    let ws = new Websocket(this.url.href);
    this.ws = ws;

    ws.on('error', err => {
      return;
    });

    ws.on('open', () => {
      this.emit('connect');
    });

    ws.on('close', (code, reason) => {
      this.emit('close', code);
      if (code === websocketCloseStatus.WEB_SOCKET_SUCCESS_CLOSE_STATUS) return;
      if (this.options.reconnect)
        this.reconnect(this.options.reconnectInterval);
    });

    ws.on('message', msg => {
      this.onMessage(JSON.parse(msg.toString()));
    });
  }

  close(): void {
    this.ws.close(websocketCloseStatus.WEB_SOCKET_SUCCESS_CLOSE_STATUS);
  }

  private reconnect(timeout?: number): void {
    if (this.options.maxReconnects === this.reconnectCount) {
      this.close();
      return;
    }

    const reconnect = () => {
      this.emit('reconnect');
      this.connect();
      this.reconnectCount++;
    };

    if (timeout) {
      setTimeout(reconnect, timeout);
    } else {
      reconnect();
    }
  }

  private onMessage(data: any): void {
    switch (data.messageType) {
      case MessageType.PLAYER_MESSAGE:
        this.onPlayerMessage(data.message);
        break;
      case MessageType.SERVER_MESSAGE:
        this.onServerMessage(data.message);
        break;
      case MessageType.SIGN_MESSAGE:
        this.onSignMessage(data.message);
        break;
      default:
        console.log(`unknown message type: ${data}`);
    }

    this.emit('message', data);
  }

  private onPlayerMessage(message): void {
    this.emit('player', message);
  }

  private onServerMessage(message): void {
    this.emit('server', message);
  }

  private onSignMessage(message): void {
    this.emit('sign', message);
  }
}

export function connect(host: string, options?: ClientOptions): Client {
  const client = new Client(host, options);
  return client;
}

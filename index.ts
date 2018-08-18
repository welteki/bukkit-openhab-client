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

export enum CommandType {
  PLAYER_HEALTH = 'PLAYER_HEALTH',
  PLAYER_WALKSPEED = 'PLAYER_WALK_SPEED',
  PLAYER_LEVEL = 'PLAYER_LEVEL',
  PLAYER_GAMEMODE = 'PLAYER_GAME_MODE',
  PLAYER_LOCATION = 'PLAYER_LOCATION',
  SIGN_STATE = 'COMMAND_SIGN_ACTIVE'
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

interface Command {
  type: CommandType;
  value: any;
}

interface PlayerCommand {
  playerName: string;
}

interface SignCommand {
  signName: string;
}

export interface PlayerHealthCommand extends PlayerCommand {
  health: number;
}

export interface PlayerWalkSpeedCommand extends PlayerCommand {
  walkSpeed: number;
}

export interface PlayerLevelCommand extends PlayerCommand {
  level: number;
}

export interface PlayerGameModeCommand extends PlayerCommand {
  gameMode: GameMode;
}

export interface PlayerLocationCommand extends PlayerCommand {
  location: string;
}

export interface SignStateCommand extends SignCommand {
  state: boolean;
}

type CommandArgs =
  | PlayerHealthCommand
  | PlayerWalkSpeedCommand
  | PlayerLevelCommand
  | PlayerGameModeCommand
  | PlayerLocationCommand
  | SignStateCommand;

export type GameMode = 'CREATIVE' | 'SURVIVAL' | 'ADVENTURE' | 'SPECTATOR';

type BukkitPlayerCommand = Command & PlayerCommand;
type BukkitSignCommand = Command & SignCommand;

const commandType = new Map<CommandType, string>([
  [CommandType.PLAYER_HEALTH, 'PLAYER_HEALTH'],
  [CommandType.PLAYER_WALKSPEED, 'PLAYER_WALKSPEED'],
  [CommandType.PLAYER_LEVEL, 'PLAYER_LEVEL'],
  [CommandType.PLAYER_GAMEMODE, 'PLAYER_GAMEMODE'],
  [CommandType.PLAYER_LOCATION, 'PLAYER_LOCATION'],
  [CommandType.SIGN_STATE, 'SIGN_STATE']
]);

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

  send(command: CommandType, commandArgs: CommandArgs): void {
    const invalidArgsError = `invalid arguments for commandType: ${commandType.get(
      command
    )}`;
    switch (command) {
      case CommandType.PLAYER_HEALTH:
        if (isPlayerHealthCommand(commandArgs)) {
          const { playerName, health } = commandArgs;
          this.sendCommand(MessageType.PLAYER_COMMANDS_MESSAGE, {
            type: command,
            playerName,
            value: health
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      case CommandType.PLAYER_WALKSPEED:
        if (isPlayerWalkSpeedCommand(commandArgs)) {
          const { playerName, walkSpeed } = commandArgs;
          this.sendCommand(MessageType.PLAYER_COMMANDS_MESSAGE, {
            type: command,
            playerName,
            value: walkSpeed
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      case CommandType.PLAYER_LEVEL:
        if (isPlayerLevelCommand(commandArgs)) {
          const { playerName, level } = commandArgs;
          this.sendCommand(MessageType.PLAYER_COMMANDS_MESSAGE, {
            type: command,
            playerName,
            value: level
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      case CommandType.PLAYER_GAMEMODE:
        if (isPlayerGameModeCommand(commandArgs)) {
          const { playerName, gameMode } = commandArgs;
          this.sendCommand(MessageType.PLAYER_COMMANDS_MESSAGE, {
            type: command,
            playerName,
            value: gameMode
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      case CommandType.PLAYER_LOCATION:
        if (isPlayerLocationCommand(commandArgs)) {
          const { playerName, location } = commandArgs;
          this.sendCommand(MessageType.PLAYER_COMMANDS_MESSAGE, {
            type: command,
            playerName,
            value: location
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      case CommandType.SIGN_STATE:
        if (isSignStateCommand(commandArgs)) {
          const { signName, state } = commandArgs;
          this.sendCommand(MessageType.SIGN_COMMANDS_MESSAGE, {
            type: command,
            signName,
            value: state
          });
        } else {
          this.emit('error', invalidArgsError);
        }
        break;
      default:
        this.emit('error', `unknown command type: ${command}`);
    }
  }

  private sendCommand(
    messageType:
      | MessageType.PLAYER_COMMANDS_MESSAGE
      | MessageType.SIGN_COMMANDS_MESSAGE,
    message: BukkitPlayerCommand | BukkitSignCommand
  ) {
    this.ws.send(JSON.stringify({ messageType, message }));
  }
}

export function connect(host: string, options?: ClientOptions): Client {
  const client = new Client(host, options);
  return client;
}

function isPlayerCommand(
  command: CommandArgs | SignCommand | PlayerCommand
): command is PlayerCommand {
  return (<PlayerCommand>command).playerName !== undefined;
}

function isSignCommand(
  command: CommandArgs | SignCommand | PlayerCommand
): command is SignCommand {
  return (<SignCommand>command).signName !== undefined;
}

function isPlayerHealthCommand(
  command: CommandArgs
): command is PlayerHealthCommand {
  return (
    isPlayerCommand(command) &&
    (<PlayerHealthCommand>command).health !== undefined
  );
}

function isPlayerWalkSpeedCommand(
  command: CommandArgs
): command is PlayerWalkSpeedCommand {
  return (
    isPlayerCommand(command) &&
    (<PlayerWalkSpeedCommand>command).walkSpeed !== undefined
  );
}

function isPlayerLevelCommand(
  command: CommandArgs
): command is PlayerLevelCommand {
  return (
    isPlayerCommand(command) &&
    (<PlayerLevelCommand>command).level !== undefined
  );
}

function isPlayerGameModeCommand(
  command: CommandArgs
): command is PlayerGameModeCommand {
  return (
    isPlayerCommand(command) &&
    (<PlayerGameModeCommand>command).gameMode !== undefined
  );
}

function isPlayerLocationCommand(
  command: CommandArgs
): command is PlayerLocationCommand {
  return (
    isPlayerCommand(command) &&
    (<PlayerLocationCommand>command).location !== undefined
  );
}

function isSignStateCommand(command: CommandArgs): command is SignStateCommand {
  return (
    isSignCommand(command) && (<SignStateCommand>command).state !== undefined
  );
}

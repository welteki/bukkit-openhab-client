# bukkit-openhab-client

NodeJs client for the Minecraft [bukkit-openhab-plugin](https://github.com/ibaton/bukkit-openhab-plugin)

## Installation

```sh
npm install bukkit-openhab-client
```

## Example

```javascript
const OH = require('bukkit-openhab-client');

let client = OH.connect('localhost');

client.on('connect', function() {
  console.log('connected');
});

client.on('message', function(msg) {
  console.log(msg);
});

client.on('player', function(msg) {
  console.log(msg);
});
```

## API

### OH.connect(host, [options])

Connect to a server specified by the given url and returns the `Client`

The arguments are:

- `host`: bukkit server host
- `options`
  - `reconnect`: attempt reconnect, **default** = `true`
  - `reconnectInterval`: the interval to try a reconnect, **default** = `6000`
  - `maxReconnect`: maximum reconnection attempts

### OH.Client(host, [options])

Accepts the same arguments as described in the connect function

#### Event `'connect'`

`function () {}`

Emitted on successful (re)connection

#### Event `'close'`

`function (code) {}`

Emitted after a disconnection.

- `code` disconnection status code

#### Event `'reconnect'`

`function () {}`

Emitted when a reconnect starts.

#### Event `'message'`

`function (message) {}`

Emitted when the client receives a message

- `message`
  - `messageType` number indicating the type of the message
  - `message` the message content

#### Event `'player'`

`function (message) {}`

Emitted when the client receives a player message

example player message:

```javascript
[
  {
    displayName: 'welteki',
    name: 'welteki',
    level: 0,
    totalExperience: 0,
    experience: 0.0,
    health: 13.333335876464844,
    healthScale: 20.0,
    walkSpeed: 0.2,
    location: {
      x: 374.54182933731164,
      y: 74.0,
      z: 262.8878343833861,
      pitch: 18.899847,
      yaw: 143.69923
    },
    gameMode: 'CREATIVE'
  }
];
```

#### Event `'sign'`

`function (message) {}`

Emitted when the client receives a sign message

example sign message:

```javascript
[
  {
    name: 'Foo',
    state: true,
    location: {
      x: 372.0,
      y: 75.0,
      z: 260.0,
      pitch: 0.0,
      yaw: 0.0
    }
  }
];
```

#### Event `'server'`

`function (message) {}`

Emitted when the client receives a server message

example server message:

```javascript
{
  name: 'CraftBukkit',
  version: 'git-Spigot-549c1fa-2ee49b4 (MC: 1.12.2)',
  bukkitVersion: '1.12.2-R0.1-SNAPSHOT',
  maxPlayers: 20,
  players: 1
}
```

### OH.Client#close()

Close websocket connection to the server

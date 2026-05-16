# Deployment

## Single Public Port

Some servers only allow a limited public port range. OpenCode Mobile supports this by putting the mobile agent on the public port and forwarding selected OpenCode API calls to the local OpenCode server.

Recommended layout for a server that only exposes `2250-2300`:

```text
Android app
  |
  | https://your-server.example.com:2250
  v
opencode-mobile-agent :2250
  |
  | http://127.0.0.1:4096
  v
opencode serve
```

The default agent config uses:

```json
{
  "host": "127.0.0.1",
  "port": 2250,
  "opencodeUrl": "http://127.0.0.1:4096",
  "opencodeForwardPrefix": "/opencode"
}
```

For direct public binding, set `host` to `0.0.0.0` and keep a strong token. HTTPS is still recommended.

## Forwarded Paths

The agent forwards authenticated requests from:

```text
/opencode/*
```

to the local OpenCode server. For example:

```text
GET /opencode/global/health -> GET http://127.0.0.1:4096/global/health
GET /opencode/event         -> GET http://127.0.0.1:4096/event
```

The agent strips the mobile `Authorization` header before forwarding so the token is not leaked to OpenCode.

## Mobile WebSocket

The Android app connects to:

```text
wss://your-server.example.com:2250/ws
```

or, without TLS during private testing:

```text
ws://your-server.example.com:2250/ws
```

The first WebSocket message must be:

```json
{
  "type": "auth",
  "token": "your-agent-token"
}
```

## Starting Services

Start OpenCode on localhost:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

Start the mobile agent on one of the externally allowed ports:

```bash
opencode-mobile-agent start
```

If `2250` is already in use, edit the agent config and choose another port in `2250-2300`.

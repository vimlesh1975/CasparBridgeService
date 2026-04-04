# Caspar Bridge Service

This project creates a small Windows bridge app that:

- runs locally on `http://127.0.0.1:3000`
- accepts HTTP requests from your online web page
- forwards AMCP commands to CasparCG

The installed Windows machine does not need Node.js. The installer is intended to ship a standalone `CasparBridgeService.exe`.

## API

### `POST /api/casparcg`

Example request:

```bash
curl -X POST http://127.0.0.1:3000/api/casparcg ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"endpoint\",\"command\":\"PLAY 1-1 AMB\"}"
```

Allowed payload:

```json
{
  "action": "endpoint",
  "command": "PLAY 1-1 AMB"
}
```

### `OPTIONS /api/casparcg`

Responds with CORS headers so your online page can call the local bridge.

### `GET /health`

Returns the bridge status and current CasparCG target host/port.

The health response also includes:

- `envPath`
- `logPath`
- `lastRequestAt`
- `lastCommand`
- `lastError`

The bridge writes request and error logs to `bridge.log` beside the EXE.

## Configuration

Copy `.env.example` to `.env` and adjust values:

```env
PORT=3000
CASPAR_HOST=127.0.0.1
CASPAR_PORT=5250
ALLOWED_ORIGIN=*
API_TOKEN=
```

When you run the packaged EXE, place `.env` in the same folder as `CasparBridgeService.exe`.

Use `ALLOWED_ORIGIN` to lock access to your domain, for example:

```env
ALLOWED_ORIGIN=https://yourdomain.com
```

If you set `API_TOKEN`, callers must send either:

- `X-API-Token: your-token`
- `Authorization: Bearer your-token`

## Local development

```bash
npm install
npm start
```

## Build standalone Windows EXE

```bash
npm install
npm run build:exe
```

This produces:

- `build/CasparBridgeService.exe`

This EXE includes the Node runtime inside the file, so Node does not need to be installed on the target PC.

## Build Windows service installer

Install [Inno Setup](https://jrsoftware.org/isinfo.php), download WinSW, then run:

```bash
npm install
npm run download:winsw
npm run build:installer
```

This produces:

- `build/CasparBridgeService-Service-Setup.exe`

The installer:

- copies the bridge EXE
- installs a Windows service
- starts the service automatically
- keeps service wrapper logs in `service-logs`

## Calling from an online page

Example browser request:

```js
await fetch("http://127.0.0.1:3000/api/casparcg", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    action: "endpoint",
    command: "PLAY 1-1 AMB"
  })
});
```

If your page is hosted online and the bridge runs on the user's machine, the browser can call the local bridge directly as long as:

- the user has installed and started the bridge
- the bridge allows your site in `ALLOWED_ORIGIN`
- the browser allows the page to reach `localhost`

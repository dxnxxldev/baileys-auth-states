# 🗝️ Baileys Auth States

This repository contains multiple implementations of custom authentication state handlers (`useAuthState`) for [Baileys](https://github.com/WhiskeySockets/Baileys), using different storage backends:

- 🧠 SQLite (`better-sqlite3`)
- ⚡ Redis (`ioredis`)
- 🍃 MongoDB (`mongodb`)

Each adapter is designed to be plug-and-play with your Baileys bot, giving you full control over how sessions are persisted.

---

### 📦 Install
```bash
npm i github:dxnxxldev/baileys-auth-states
```

---

### 🚀 Usage

#### ⚡ useRedisAuthState

```javascript
import { useRedisAuthState } from "baileys-auth-states";
import { makeWASocket, DisconnectReason } from "baileys";
import { Boom } from "@hapi/boom";

const { state, saveCreds, removeCreds, redis } = await useRedisAuthState({
  sessionId: "main", //session identifier
  host: "127.0.0.1",
  port: "6379",
});
const mws = makeWASocket({
  auth: state,
});
mws.ev.on("creds.update", saveCreds); //save the credentials
mws.ev.on("connection.update", async (evt) => {
  if (evt.connection == "close") {
    const code = new Boom(evt.lastDisconnect?.error)?.output?.statusCode;
    if (code == DisconnectReason.loggedOut) {
      await removeCreds(); //delete credentials
    }
  }
});
```

---

### 🍃 useMongoAuthState

```javascript
import { useMongoAuthState } from "baileys-auth-states";
import { makeWASocket, DisconnectReason } from "baileys";
import { Boom } from "@hapi/boom";

const { state, saveCreds, removeCreds, mongo } = await useMongoAuthState({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "BaileysAuth",
  collectionName: "sessions",
  sessionId: "main", //session identifier
});
const mws = makeWASocket({
  auth: state,
});
mws.ev.on("creds.update", saveCreds); //save the credentials
mws.ev.on("connection.update", async (evt) => {
  if (evt.connection == "close") {
    const code = new Boom(evt.lastDisconnect?.error)?.output?.statusCode;
    if (code == DisconnectReason.loggedOut) {
      await removeCreds(); //delete credentials
    }
  }
});
```

---

### 🧠 useSQLiteAuthState

```javascript
import { useSQLiteAuthState } from "baileys-auth-states";
import { makeWASocket, DisconnectReason } from "baileys";
import { Boom } from "@hapi/boom";

const { state, saveCreds, removeCreds, db } = await useSQLiteAuthState({
  filename: "session.db",
  sessionId: "main", //session identifier
});
const mws = makeWASocket({
  auth: state,
});
mws.ev.on("creds.update", saveCreds); //save the credentials
mws.ev.on("connection.update", async (evt) => {
  if (evt.connection == "close") {
    const code = new Boom(evt.lastDisconnect?.error)?.output?.statusCode;
    if (code == DisconnectReason.loggedOut) {
      await removeCreds(); //delete credentials
    }
  }
});
```

---

### 💡 Tips

Each session is namespaced using the `sessionId`, so you can safely handle multiple bots in one DB.

You can inspect or clear data manually in your DB of choice.

All data is serialized using Baileys' BufferJSON to preserve binary integrity.

---

### 📃 License

MIT — feel free to fork, extend or contribute!

---

### 🤝 Contribute

Have a favorite DB that’s not here? Open a PR or issue — contributions are always welcome!

---

## 🐾 Maintained by
> **[Dxnxxl](https://github.com/dxnxxldev)** with ❤️
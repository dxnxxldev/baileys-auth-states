import * as baileys from "baileys";
import Database from "better-sqlite3";
export async function useSQLiteAuthState(options) {
    const { filename, sessionId, ...databaseConfig } = options;
    const prefix = `baileys-auth-state:${sessionId}`;
    const db = new Database(filename, databaseConfig);
    db.pragma("journal_mode = WAL");
    db.prepare("CREATE TABLE IF NOT EXISTS BaileysAuth (id TEXT PRIMARY KEY, value TEXT NOT NULL)").run();
    const readData = (key) => {
        const row = db.prepare("SELECT value FROM BaileysAuth WHERE id = ?").get(`${prefix}:${key}`);
        if (row?.value) {
            return JSON.parse(row.value, baileys.BufferJSON.reviver);
        }
        return null;
    };
    const writeData = (key, value) => {
        db.prepare("INSERT INTO BaileysAuth (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value").run(`${prefix}:${key}`, JSON.stringify(value, baileys.BufferJSON.replacer));
    };
    const deleteData = (key) => {
        db.prepare("DELETE FROM BaileysAuth WHERE id = ?").run(`${prefix}:${key}`);
    };
    const creds = await readData("creds") || baileys.initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
                        if (value) {
                            if (type === "app-state-sync-key") {
                                value = baileys.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: (data) => {
                    for (const type in data) {
                        const i = type;
                        for (const id in data[i]) {
                            const value = data[i][id];
                            if (value) {
                                writeData(`${type}-${id}`, value);
                            }
                            else {
                                deleteData(`${type}-${id}`);
                            }
                        }
                    }
                },
            },
        },
        saveCreds: async () => {
            writeData("creds", creds);
        },
        removeCreds: async () => {
            db.prepare("DELETE FROM BaileysAuth WHERE id LIKE ?").run(`${prefix}:%`);
        },
        db,
    };
}
;

import * as baileys from "baileys";
import { MongoClient } from "mongodb";
export async function useMongoAuthState(options) {
    const prefix = `baileys-auth-state:${options.sessionId}`;
    const mongo = new MongoClient(options.uri, options);
    await mongo.connect();
    const db = mongo.db(options.databaseName);
    ;
    const collection = db.collection(options.collectionName);
    const readData = async (key) => {
        const document = await collection.findOne({ _id: `${prefix}:${key}` });
        if (document?.value) {
            return JSON.parse(document.value, baileys.BufferJSON.reviver);
        }
        return null;
    };
    const writeData = async (key, value) => {
        await collection.updateOne({ _id: `${prefix}:${key}` }, {
            $set: {
                value: JSON.stringify(value, baileys.BufferJSON.replacer),
            },
        }, { upsert: true });
    };
    const deleteData = async (key) => {
        await collection.deleteOne({ _id: `${prefix}:${key}` });
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
                set: async (data) => {
                    const tasks = [];
                    for (const type in data) {
                        const i = type;
                        for (const id in data[i]) {
                            const value = data[i][id];
                            if (value) {
                                tasks.push(writeData(`${type}-${id}`, value));
                            }
                            else {
                                tasks.push(deleteData(`${type}-${id}`));
                            }
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: async () => {
            await writeData("creds", creds);
        },
        removeCreds: async () => {
            const documents = await collection.find({
                _id: {
                    $regex: `^${prefix}:`,
                },
            }).toArray();
            if (documents.length) {
                await collection.deleteMany({
                    _id: {
                        $in: documents.map((document) => document._id),
                    },
                });
            }
        },
        mongo,
    };
}
;

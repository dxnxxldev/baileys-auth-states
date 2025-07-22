
import * as baileys from "baileys";
import { MongoAuthState, MongoAuthStateOptions } from "../../types";
import { Document, MongoClient } from "mongodb";

export async function useMongoAuthState(options: MongoAuthStateOptions): Promise<MongoAuthState> {
    const prefix = `baileys-auth-state:${options.sessionId}`;
    const mongo = new MongoClient(options.uri, options);
    await mongo.connect();
    const db = mongo.db(options.databaseName);
    interface AuthDocument extends Document {
        _id: string;
        value: string;
    };
    const collection = db.collection<AuthDocument>(options.collectionName);
    const readData = async (key: string) => {
        const document = await collection.findOne({ _id: `${prefix}:${key}` });
        if (document?.value) {
            return JSON.parse(document.value, baileys.BufferJSON.reviver);
        }
        return null;
    }
    const writeData = async (key: string, value: any) => {
        await collection.updateOne({ _id: `${prefix}:${key}` }, {
            $set: {
                value: JSON.stringify(value, baileys.BufferJSON.replacer),
            },
        }, { upsert: true });
    }
    const deleteData = async (key: string) => {
        await collection.deleteOne({ _id: `${prefix}:${key}` });
    }
    const creds: baileys.AuthenticationCreds = await readData("creds") || baileys.initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async <T extends keyof baileys.SignalDataTypeMap>(type: T, ids: string[]) => {
                    const data: { [id: string]: baileys.SignalDataTypeMap[T] } = {};
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
                set: async (data: baileys.SignalDataSet) => {
                    const tasks: Promise<void>[] = [];
                    for (const type in data) {
                        const i = type as keyof baileys.SignalDataSet;
                        for (const id in data[i]) {
                            const value = data[i][id];
                            if (value) {
                                tasks.push(writeData(`${type}-${id}`, value));
                            } else {
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
};
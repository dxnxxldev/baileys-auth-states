
import Redis from "ioredis";
import * as baileys from "baileys";
import { RedisAuthState, RedisAuthStateOptions } from "../../types";

export async function useRedisAuthState(options: RedisAuthStateOptions): Promise<RedisAuthState> {
    const { sessionId, ...redisConfig } = options;
    const prefix = `baileys-auth-state:${sessionId}`;
    const redis = new Redis(redisConfig);
    const readData = async (key: string) => {
        const value = await redis.get(`${prefix}:${key}`);
        if (value) {
            return JSON.parse(value, baileys.BufferJSON.reviver);
        }
        return null;
    }
    const writeData = async (key: string, value: any) => {
        await redis.set(`${prefix}:${key}`, JSON.stringify(value, baileys.BufferJSON.replacer));
    }
    const deleteData = async (key: string) => {
        await redis.del(`${prefix}:${key}`);
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
            const keys = await redis.keys(`${prefix}:*`);
            if (keys.length) {
                await redis.del(...keys);
            }
        },
        redis,
    };
};
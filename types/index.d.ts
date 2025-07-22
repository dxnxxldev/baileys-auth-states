import { AuthenticationState } from "baileys";
import { Database, Options } from "better-sqlite3";
import Redis, { RedisOptions } from "ioredis";
import { MongoClient, MongoClientOptions } from "mongodb";

type AuthState = {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    removeCreds: () => Promise<void>;
};

export interface RedisAuthState extends AuthState {
    redis: Redis;
};

export interface RedisAuthStateOptions extends RedisOptions {
    sessionId: string;
};

export interface MongoAuthState extends AuthState {
    mongo: MongoClient;
};

export interface MongoAuthStateOptions extends MongoClientOptions {
    uri: string;
    databaseName: string;
    collectionName: string;
    sessionId: string;
};

export interface SQliteAuthState extends AuthState {
    db: Database;
};

export interface SQLiteAuthStateOptions extends Options {
    sessionId: string;
    filename: string;
};
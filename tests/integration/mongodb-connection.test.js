import mongoose from "mongoose";
import { afterAll, describe, expect, it } from "vitest";
import {
  DatabaseUnavailableError,
  connectToDatabase,
  disconnectFromDatabase,
  getConnectionState,
} from "@/api/lib/mongodb/connection";
import { checkDatabaseHealth } from "@/api/lib/mongodb/health";
import { TEST_DB_URI, UNREACHABLE_DB_URI, databaseSuiteGate } from "../helpers/database.js";

const gate = await databaseSuiteGate("mongodb-connection");

describe.skipIf(gate.skip)("MongoDB connection module", () => {
  afterAll(async () => {
    await disconnectFromDatabase();
  });

  it("connects to the test database and reuses the cached connection", async () => {
    const first = await connectToDatabase({ uri: TEST_DB_URI });
    expect(getConnectionState()).toBe("connected");
    expect(mongoose.connection.name).toMatch(/_test$/);

    const second = await connectToDatabase({ uri: TEST_DB_URI });
    expect(second).toBe(first);
  });

  it("reports a healthy database with a latency figure", async () => {
    const health = await checkDatabaseHealth({ uri: TEST_DB_URI });
    expect(health.status).toBe("ok");
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.message).toBeUndefined();
  });

  it("disconnects cleanly and can reconnect afterwards", async () => {
    await disconnectFromDatabase();
    expect(getConnectionState()).toBe("disconnected");

    await connectToDatabase({ uri: TEST_DB_URI });
    expect(getConnectionState()).toBe("connected");
  });

  it("throws DatabaseUnavailableError when the server cannot be reached", async () => {
    await disconnectFromDatabase();
    await expect(connectToDatabase({ uri: UNREACHABLE_DB_URI })).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
    // A failed attempt must not poison the cache: the next connect retries.
    await connectToDatabase({ uri: TEST_DB_URI });
    expect(getConnectionState()).toBe("connected");
  });
});

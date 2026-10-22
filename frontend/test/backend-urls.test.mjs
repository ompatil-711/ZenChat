import test from "node:test";
import assert from "node:assert/strict";
import { resolveBackendUrls } from "../config/backend-urls.mjs";

const publicConfig = {
  userUrl: "https://users.example.com",
  chatUrl: "https://chat.example.com",
  production: true,
};

test("development reads explicit localhost URLs from environment configuration", () => {
  assert.deepEqual(resolveBackendUrls({
    userUrl: "http://localhost:5000",
    chatUrl: "http://localhost:5001",
    production: false,
  }), { user: "http://localhost:5000", chat: "http://localhost:5001" });
});

test("neither service silently falls back when configuration is missing", () => {
  for (const production of [false, true]) {
    for (const key of ["userUrl", "chatUrl"]) {
      for (const value of [undefined, "", "   "]) {
        assert.throws(() => resolveBackendUrls({ ...publicConfig, production, [key]: value }), /is required/);
      }
    }
  }
});

test("production rejects local destinations for both API and Socket.IO configuration", () => {
  const destinations = [
    "http://localhost:5000", "https://localhost", "https://LOCALHOST.",
    "https://api.localhost", "https://server.local", "https://127.0.0.1",
    "https://127.1", "https://2130706433", "https://10.0.0.1", "https://192.168.1.1",
    "https://172.16.0.1", "https://169.254.0.1", "https://[::1]", "https://[::ffff:127.0.0.1]",
    "https://[fd00::1]", "https://[fe80::1]", "http://users.example.com",
  ];
  for (const key of ["userUrl", "chatUrl"]) {
    for (const value of destinations) {
      assert.throws(() => resolveBackendUrls({ ...publicConfig, [key]: value }), /public HTTPS/);
    }
  }
});

test("public HTTPS service roots are normalized independently", () => {
  assert.deepEqual(resolveBackendUrls({ ...publicConfig, userUrl: " https://users.example.com/ " }), {
    user: "https://users.example.com", chat: "https://chat.example.com",
  });
});

test("invalid URLs and embedded credentials are rejected without echoing their values", () => {
  for (const userUrl of ["/api", "not-a-url", "ftp://example.com", "https://user:private@example.com", "https://example.com?token=private"]) {
    assert.throws(() => resolveBackendUrls({ ...publicConfig, userUrl }), error => {
      assert.equal(error.message.includes("private"), false);
      return true;
    });
  }
});

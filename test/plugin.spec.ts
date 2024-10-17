import { runCommand } from "./test-utils";

jest.setTimeout(1000 * 60 * 60); // 1 hour
describe("Plugin tests", () => {
  let stopServer: (() => void) | null = null;
  let serverResult: Promise<string> | null = null;

  beforeAll(async () => {
    const { result: buildResult } = runCommand("pnpm", ["dev:build"]);
    await buildResult;
    console.info("Build complete");
    const { result: _serverResult, stop: _stopServer } = runCommand("pnpm", [
      "dev:start",
    ]);
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch("http://localhost:3000/admin");
        if (res.status === 200) {
          console.info("Server started");
          break;
        }
      } catch (e) {
        console.info("Waiting for server to start...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    serverResult = _serverResult;
    stopServer = _stopServer;
  });

  it("should pass", async () => {
    expect(true).toBe(true);
  });

  afterAll(async () => {
    stopServer?.();
    await serverResult;
  });
});

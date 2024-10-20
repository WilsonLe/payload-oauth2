import { ChildProcess, spawn } from "child_process";
import kill from "tree-kill";

export function runCommand(
  command: string,
  args: string[] = [],
  verbose: boolean = false,
) {
  const cmdProcess: ChildProcess = spawn(command, args, {
    stdio: ["inherit", "pipe"],
    detached: process.platform !== "win32", // Detached only for non-Windows platforms
  });

  let output = "";

  return {
    process: cmdProcess, // Expose the process so you can access it later
    result: new Promise<string | null>((resolve, reject) => {
      // Capture and log stdout
      cmdProcess.stdout?.on("data", (data) => {
        const dataString = data.toString();
        output += dataString;
        if (verbose) console.log(dataString); // Log to console
      });

      // Capture and log stderr
      cmdProcess.stderr?.on("data", (data) => {
        const errorString = data.toString();
        output += errorString;
        if (verbose) console.error(errorString); // Log to console
      });

      cmdProcess.on("close", (code) => {
        if (code === 0 || code === null) {
          resolve(output); // Return captured output
        } else {
          resolve(null);
        }
      });
    }),
    stop: () => {
      if (cmdProcess.pid) {
        kill(cmdProcess.pid, "SIGTERM", (err) => {
          if (err) {
            console.error("Failed to kill process:", err);
          } else {
            console.log("Process killed successfully");
          }
        });
      }
    },
  };
}

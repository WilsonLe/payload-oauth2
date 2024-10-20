import { ChildProcess, spawn } from "child_process";

export function runCommand(
  command: string,
  args: string[] = [],
  verbose: boolean = false,
) {
  const cmdProcess: ChildProcess = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    detached: true, // Ensure a new process group is created
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
        process.kill(-cmdProcess.pid); // Kill the process group
      }
    },
  };
}

import { ChildProcess, spawn } from "child_process";

export function runCommand(
  command: string,
  args: string[] = [],
  verbose: boolean = false,
) {
  const cmdProcess: ChildProcess = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
  });

  let output = "";

  return {
    process: cmdProcess, // Expose the process so you can access it later
    result: new Promise<string>((resolve, reject) => {
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
        if (code === 0) {
          resolve(output); // Return captured output
        } else {
          reject(new Error(`Command failed with code: ${code}`));
        }
      });
    }),
    stop: () => {
      cmdProcess.kill(); // This will stop the process
    },
  };
}

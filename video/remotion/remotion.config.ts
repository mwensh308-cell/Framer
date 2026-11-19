import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Cloud sandbox: use the pre-installed Chromium. Elsewhere Remotion downloads its own.
const sandboxChromium = "/opt/pw-browsers/chromium";
if (existsSync(sandboxChromium)) {
  Config.setBrowserExecutable(sandboxChromium);
}

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const staticDirectory = fileURLToPath(new URL("../.next/static/", import.meta.url));

async function readStyles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const styles = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return readStyles(filename);
    return entry.name.endsWith(".css") ? readFile(filename, "utf8") : "";
  }));
  return styles.join("\n");
}

// Check emitted artifacts: Next can finish successfully with only Tailwind's
// reset styles when source detection fails, leaving the deployed UI unstyled.
const css = await readStyles(staticDirectory);
const requiredUtilities = ["bg-gray-900", "bg-blue-600", "flex", "items-center", "min-h-screen"];
const missing = requiredUtilities.filter((name) => !new RegExp(`\\.${name}\\s*\\{`).test(css));

if (missing.length) {
  throw new Error(`Production CSS is missing required Tailwind utilities: ${missing.join(", ")}. Check globals.css source paths.`);
}

console.log("Production CSS verified: login layout and color utilities are present.");

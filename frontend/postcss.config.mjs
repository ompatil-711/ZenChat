import { fileURLToPath } from "node:url";
import path from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.join(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
};

export default config;

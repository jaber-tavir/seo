import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "out/**"],
  },
  {
    rules: {
      // Intentional, documented `any` is used in the generic API wrapper.
      "@typescript-eslint/no-explicit-any": "off",
      // Structured logger + startup validation write to the console by design.
      "no-console": "off",
    },
  },
];

export default eslintConfig;

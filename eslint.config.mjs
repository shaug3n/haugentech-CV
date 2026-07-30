import { FlatCompat } from "@eslint/eslintrc";

// `eslint-config-next` still ships only the legacy (eslintrc) shape — it has no
// flat-config export as of 15.5 — so it is bridged in with FlatCompat, which is
// what `next lint` did internally before it was deprecated.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "**/*.tsbuildinfo",
    ],
  },
  // core-web-vitals: Next's recommended rules with the image/script/font
  // performance rules promoted to errors. typescript: the TS-aware overlay.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;

// eslint.config.mjs
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import typescriptEslintParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import myLocalPlugin from "./eslint/index.js"; // <-- import local rules

const config = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["proxies/**/*.ts", "git-protocol-proxy/**/*.ts"],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      "react-hooks": reactHooksPlugin,
      react: reactPlugin,
      myhooks: myLocalPlugin, // <-- register local plugin
    },
    rules: {
      "@typescript-eslint/no-base-to-string": "error",
      // Keep normal exhaustive-deps for built-in hooks
      "react-hooks/exhaustive-deps": [
        "warn",
        {
          additionalHooks: "(useAsyncEffect)", // add any additional hooks you want to check
        },
      ],

      // Use our custom rule for our hooks
      // "myhooks/exhaustive-deps": [
      //   "warn",
      //   {
      //     hooks: ["useAsyncEffect"], // list your custom hooks here
      //   },
      // ],

      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;

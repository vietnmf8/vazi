import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
        ],
    },
    ...nextConfig,
    {
        rules: {
            "react-hooks/exhaustive-deps": "off",
            "@next/next/no-img-element": "off",
            "react-compiler/react-compiler": "off",
            "react-hooks/incompatible-library": "off"
        }
    }
];

export default eslintConfig;

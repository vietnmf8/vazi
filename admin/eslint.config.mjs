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
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/exhaustive-deps": "off",
            "@next/next/no-img-element": "off",
            "react-hooks/refs": "off",
            "react-hooks/incompatible-library": "off",
            "react-hooks/purity": "off",
            "react/display-name": "off",
            "react-hooks/rules-of-hooks": "off"
        }
    }
];

export default eslintConfig;

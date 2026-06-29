/**
 * PM2 — UI production (Next.js).
 *
 * Usage: npm run build && pm2 start ecosystem.config.cjs
 */
module.exports = {
    apps: [
        {
            name: "fastvisa-ui",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3000",
            cwd: __dirname,
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            max_restarts: 10,
            min_uptime: "10s",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};

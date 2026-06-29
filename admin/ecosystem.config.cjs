/**
 * PM2 — Admin dashboard production (Next.js :3001).
 *
 * Usage: npm run build && pm2 start ecosystem.config.cjs
 */
module.exports = {
    apps: [
        {
            name: "fastvisa-admin",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3001",
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

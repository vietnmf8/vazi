/**
 * PM2 — chạy 3 tiến trình API production (HTTP + worker + schedule).
 *
 * Usage:
 *   npm run build
 *   npm run db:setup          # lần đầu / sau migrate
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs
 *   pm2 save && pm2 startup   # persist sau reboot (Linux)
 */
const NODE_ARGS = "-r tsconfig-paths/register -r module-alias/register";

/** @type {import('pm2').StartOptions[]} */
const apps = [
    {
        name: "fastvisa-api",
        script: "dist/server.js",
        node_args: NODE_ARGS,
        instances: 1,
        exec_mode: "fork",
        autorestart: true,
        max_restarts: 10,
        min_uptime: "10s",
        env: {
            NODE_ENV: "production",
        },
    },
    {
        name: "fastvisa-worker",
        script: "dist/worker.js",
        node_args: NODE_ARGS,
        instances: 1,
        exec_mode: "fork",
        autorestart: true,
        max_restarts: 10,
        min_uptime: "10s",
        env: {
            NODE_ENV: "production",
        },
    },
    {
        name: "fastvisa-schedule",
        script: "dist/schedule.js",
        node_args: NODE_ARGS,
        instances: 1,
        exec_mode: "fork",
        autorestart: true,
        max_restarts: 10,
        min_uptime: "10s",
        env: {
            NODE_ENV: "production",
        },
    },
];

module.exports = { apps };

// PM2 Ecosystem — ccways.com
// Manages: Next.js frontend (port 3001) + Omnichain backend (port 8000)
// Start:  pm2 start ecosystem.config.cjs
// Stop:   pm2 stop all
// Logs:   pm2 logs
// Status: pm2 status

module.exports = {
  apps: [
    // ═══════════════════════════════════════════════════════════════════════
    // 🌐 Next.js Production Server — port 3001
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'ccways-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: 'C:\\Users\\GAME\\elhammadi\\ccways',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      autorestart: true,
      // Logging
      error_file: 'C:\\Users\\GAME\\elhammadi\\ccways\\logs\\web-error.log',
      out_file: 'C:\\Users\\GAME\\elhammadi\\ccways\\logs\\web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Memory limit (restart if >1.5GB)
      max_memory_restart: '1500M',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 Omnichain API (FastAPI + CCWAYS Gateway) — port 8000
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'ccways-api',
      script: 'C:\\Python314\\python.exe',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
      cwd: 'C:\\Users\\GAME\\elhammadi\\ccways\\api-hub\\blockchain',
      env: {
        LOG_LEVEL: 'WARNING',
        UVICORN_LOG_LEVEL: 'warning',
        TRACE_VERBOSE: '0',
        UVICORN_ACCESS_LOG: '0',
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      autorestart: true,
      // Logging
      error_file: 'C:\\Users\\GAME\\elhammadi\\ccways\\logs\\api-error.log',
      out_file: 'C:\\Users\\GAME\\elhammadi\\ccways\\logs\\api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Memory limit
      max_memory_restart: '800M',
    },
  ],
};

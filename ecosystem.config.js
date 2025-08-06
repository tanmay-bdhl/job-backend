module.exports = {
  apps: [
    {
      name: 'job-backend-server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Production settings
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true,
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Watch settings (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads']
    },
    {
      name: 'notification-worker',
      script: 'worker.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Production settings
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Watch settings (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs']
    }
  ]
}; 
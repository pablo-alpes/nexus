module.exports = {
  apps: [{
    name: 'nexus',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/nexus/nexus',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/pm2/nexus-error.log',
    out_file: '/var/log/pm2/nexus-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

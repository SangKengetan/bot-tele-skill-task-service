module.exports = {
  apps: [
    {
      name: 'task-service',
      script: 'dist/server.js',
      instances: 1, // Anda bisa ubah ke 'max' jika VPS punya banyak core CPU
      exec_mode: 'fork', // gunakan 'cluster' jika instances > 1
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G' // Mencegah crash jika terjadi memory leak
    }
  ]
};

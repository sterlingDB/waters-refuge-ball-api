module.exports = {
  apps: [
    {
      name: 'walk through christmas registration API - Node',
      script: 'npm',
      args: 'run server:start',
      env: {
        NODE_ENV: 'production',
      }
    },
  ],
};

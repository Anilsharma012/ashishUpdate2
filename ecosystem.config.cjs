module.exports = {
  apps: [
    {
      name: "ashish-properties",
      script: "start-prod.mjs",
      cwd: "/www/wwwroot/ashishproperties.in",
      node_args: "--enable-source-maps",

      // Keep this minimal. No secrets here.
      env_production: {
        NODE_ENV: "production",
        PORT: "8017",
        SPA_DIR: "/www/wwwroot/ashishproperties.in/client/dist",

        // runner flags (as you had)
        RUNNER: "0",
        DISABLE_RUNNER: "1",
        NO_RUNNER: "1",
      },
    },
  ],
};

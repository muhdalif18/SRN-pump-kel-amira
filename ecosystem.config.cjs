module.exports = {
  apps: [
    {
      name: "srn-pump-amira-normal-forever",
      script: "cmd.exe",
      args: "/c npx playwright test tests/SRN-PUMP-AMIRA-NORMAL.spec.ts",
      autorestart: true,
      restart_delay: 10000,
      time: true,
    },
    {
      name: "srn-pump-amira-penalty-forever",
      script: "cmd.exe",
      args: "/c npx playwright test tests/SRN-PUMP-AMIRA-PENALTY.spec.ts",
      autorestart: true,
      restart_delay: 10000,
      time: true,
    },
    {
      name: "srn-pump-kel-normal-forever",
      script: "cmd.exe",
      args: "/c npx playwright test tests/SRN-PUMP-KEL-NORMAL.spec.ts",
      autorestart: true,
      restart_delay: 10000,
      time: true,
    },
    {
      name: "srn-pump-kel-penalty-forever",
      script: "cmd.exe",
      args: "/c npx playwright test tests/SRN-PUMP-KEL-PENALTY.spec.ts",
      autorestart: true,
      restart_delay: 10000,
      time: true,
    },
  ],
};

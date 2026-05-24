module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    "^@app/backend-framework$": "<rootDir>/packages/platform/backend-framework/src/index.ts",
    "^@app/backend-service$": "<rootDir>/packages/platform/backend-service/src/index.ts",
    "^@app/db$": "<rootDir>/packages/platform/db/src/index.ts",
    "^@app/firebase-auth$": "<rootDir>/packages/platform/firebase-auth/src/index.ts",
    "^@app/health-service$": "<rootDir>/packages/services/health/src/index.ts",
    "^@app/logger$": "<rootDir>/packages/platform/logger/src/index.ts",
    "^@app/testing$": "<rootDir>/packages/platform/testing/src/index.ts",
  },
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/packages/**/*.test.ts",
  ],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
};

// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./", // Path to your Next.js app
});

const customJestConfig = {
  testEnvironment: "jsdom", // Simulates a browser
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // So "@/lib/foo" works in tests
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

module.exports = createJestConfig(customJestConfig);

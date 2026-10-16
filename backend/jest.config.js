/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  transform: {},
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 60000,
  verbose: true,
  moduleFileExtensions: ["js", "json"],
};

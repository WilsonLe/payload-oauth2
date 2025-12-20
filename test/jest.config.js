export default {
  verbose: true,
  testEnvironment: "node",
  testMatch: ["<rootDir>/**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: false,
          },
          target: "es2022",
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
  moduleNameMapper: {
    // Mock the payload module to avoid ESM issues
    "^payload$": "<rootDir>/__mocks__/payload.ts",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/src/mocks/fileStub.js",
    "\\.(css|scss)$": "<rootDir>/src/mocks/fileStub.js",
  },
  // Increase timeout for async tests
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true,
};

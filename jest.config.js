module.exports = {
  roots: ["<rootDir>/src"],
  clearMocks: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.ts", "!<rootDir>/src/main/**", "!<rootDir>/src/static/**"],
  modulePathIgnorePatterns: ["<rootDir>/src/static/"],
  coverageDirectory: "coverage",
  testEnvironment: "node",
  transform: {
    ".+\\.ts$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(file-type)/)",
  ],
};

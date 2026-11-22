export default {
  testEnvironment: 'node', transform: {}, testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage', clearMocks: true, testTimeout: 15000,
  coverageThreshold: { global: { lines: 95, branches: 85, functions: 95, statements: 95 } },
};

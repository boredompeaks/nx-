module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/server/**',
  ],
  coverageReporters: ['json', 'text', 'clover']
};

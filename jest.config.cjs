module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      lines: 95,
      statements: 95,
      branches: 90,
      functions: 95
    },
    './src/crypto/e2ee.ts': {
      lines: 100,
      statements: 100,
      branches: 100,
      functions: 100
    },
    './src/key/session.ts': {
      lines: 100,
      statements: 100,
      branches: 100,
      functions: 100
    },
    './src/messages/pipeline.ts': {
      lines: 100,
      statements: 100,
      branches: 100,
      functions: 100
    }
  }
};

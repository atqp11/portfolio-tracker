module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/test'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@backend/(.*)$': '<rootDir>/src/backend/$1',
    '^@frontend/(.*)$': '<rootDir>/src/frontend/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'src/backend/**/*.ts',
    'src/lib/**/*.ts',
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!**/node_modules/**',
  ],
};

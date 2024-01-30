import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'mobile-server',
  roots: ['<rootDir>/src'],
  modulePaths: ['src'],
  rootDir: '.',
  testTimeout: 10000,
  testRegex: 'src/.*.spec.ts',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};

export default config;

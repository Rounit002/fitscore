export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: [],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(png|jpg|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
  collectCoverageFrom: [
    'src/utils/nutrition.js',
    'src/utils/scoreColor.js',
    'src/utils/platformUtils.js',
    'src/api/client.js',
    'src/services/revenueCatService.js',
    'src/services/billingService.js',
    'src/geminiService.js',
    'src/context/RevenueCatContext.jsx',
    'src/components/Login.jsx',
    'src/components/SignUp.jsx',
    'src/components/Paywall.jsx',
    'src/components/PaywallContent.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/components/LoadingState.jsx',
    'src/components/ThemeToggle.jsx',
    'src/components/BarcodeScanner.jsx',
  ],
};

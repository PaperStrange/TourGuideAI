module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/"
  ],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "axios": "axios/dist/node/axios.cjs"
  },
  moduleDirectories: ['node_modules', 'src'],
  setupFilesAfterEnv: [
    "<rootDir>/src/setupTests.js"
  ]
}; 
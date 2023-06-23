module.exports = {
  launch: {
    headless: false, // Change this to false to run the test on regular Chrome
    // slowMo: 100
  },
  server: {
    command: "npm start",
    port: 8000,
  },
  browserContext: 'default',
}
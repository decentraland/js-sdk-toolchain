module.exports = {
  launch: {
    headless: false // Change this to true to run the test on regular Chrome
  },
  server: {
    command: "npm start",
    port: 8000,
  },
  browserContext: 'default',
}
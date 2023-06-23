module.exports = {
  launch: {
    headless: 'new' // Change this to false to run the test on regular Chrome
  },
  server: {
    command: "npm start",
    port: 8000,
  },
  browserContext: 'default',
}
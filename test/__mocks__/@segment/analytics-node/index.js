const Analytics = jest.mock('@segment/analytics-node')
class AnalyticsClass {
  writeKey
  constructor({ writeKey }) {
    console.log('called constructor')
    this.writeKey = writeKey
  }

  identify(opts) {
    return Promise.resolve()
  }

  track(eventName, cb) {
    return cb()
  }
}
Analytics.Analytics = AnalyticsClass

module.exports = Analytics

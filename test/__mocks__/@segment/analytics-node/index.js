const Analytics = jest.mock('@segment/analytics-node')
class AnalyticsClass {
  writeKey
  constructor({ writeKey }) {
    this.writeKey = writeKey
  }

  identify(opts) {
    return Promise.resolve()
  }

  track(eventName, cb) {
    console.log({ eventName, cb })
    return cb()
  }
}
Analytics.Analytics = AnalyticsClass

module.exports = Analytics

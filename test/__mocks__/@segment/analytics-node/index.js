const Analytics = jest.mock('@segment/analytics-node')
class AnalyticsClass {
  writeKey
  constructor({ writeKey }) {
    this.writeKey = writeKey
  }

  identify(opts) {
    return Promise.resolve()
  }

  // @segment/analytics-node v2+ `track` takes a single message object and
  // delivers events asynchronously (no per-call callback). Events are flushed
  // on closeAndFlush() or the internal flush interval.
  track(message) {
    console.log({ message })
  }

  closeAndFlush() {
    return Promise.resolve()
  }
}
Analytics.Analytics = AnalyticsClass

module.exports = Analytics

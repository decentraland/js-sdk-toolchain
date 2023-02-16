const EngineApi = jest.mock('~system/EngineApi')
EngineApi.subscribe = async () => ({})

module.exports = EngineApi

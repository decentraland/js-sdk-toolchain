import { createWallet } from '../../../packages/@dcl/sdk-commands/src/logic/account'

test('creates a valid eth account without prefix', async () => {
  const w = createWallet('236297b78470821df5d5966fb14d767f8c0ad7db73ba2cdfad675dabbf72b2f0')
  expect(w.address).toEqual('0x123418D55b884127E5a91EFeb96761d088aDc4AE')
})

test('creates a valid eth account with prefix', async () => {
  const w = createWallet('0x236297b78470821df5d5966fb14d767f8c0ad7db73ba2cdfad675dabbf72b2f0')
  expect(w.address).toEqual('0x123418D55b884127E5a91EFeb96761d088aDc4AE')
})

test('creates a valid eth account with random hex data fails', async () => {
  expect(() => createWallet('0x123418D55b884127E5a91EFeb96761d088aDc4AE')).toThrow(
    'Addresses should be 64 characters length.'
  )
})

test('creates a valid eth account with random data fails', async () => {
  expect(() => createWallet('236297b78470821df5d5966fb14d767f8c0ad7db73ba2cdfad675dabbf72bzzz')).toThrow(
    /Cannot read hex string.+/
  )
})

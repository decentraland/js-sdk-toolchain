export function assert(condition: boolean, error: string) {
  if (!condition) console.error('❌ ' + error)
  else console.log('✅ ' + error)
}

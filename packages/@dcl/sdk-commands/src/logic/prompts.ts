import * as readline from 'readline/promises'

type Question = {
  type: 'text' | 'confirm' | 'number'
  name: string
  message: string
  initial?: boolean | string | number
  validate?: (value: any) => boolean | Promise<boolean>
}

type Options = { onCancel?: () => void }

export default async function prompts(
  question: Question,
  options: Options = {}
): Promise<Record<string, any>> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    for (;;) {
      const suffix = question.type === 'confirm' ? (question.initial ? ' [Y/n] ' : ' [y/N] ') : ' '
      const answer = await rl.question(`${question.message}${suffix}`)
      if (question.type === 'confirm') {
        const value = answer === '' ? !!question.initial : /^y(es)?$/i.test(answer)
        return { [question.name]: value }
      }
      const value = question.type === 'number' ? Number(answer) : answer
      if (question.type === 'number' && Number.isNaN(value)) continue
      if (!question.validate || (await question.validate(value))) {
        return { [question.name]: value }
      }
    }
  } catch {
    options.onCancel?.()
    return {}
  } finally {
    rl.close()
  }
}

import * as readline from 'readline/promises'

type BaseQuestion = { name: string; message: string }
type TextQuestion = BaseQuestion & {
  type: 'text'
  validate?: (value: string) => boolean | Promise<boolean>
}
type NumberQuestion = BaseQuestion & {
  type: 'number'
  validate?: (value: number) => boolean | Promise<boolean>
}
type ConfirmQuestion = BaseQuestion & { type: 'confirm'; initial?: boolean }
type Question = TextQuestion | NumberQuestion | ConfirmQuestion

type Options = { onCancel?: () => void }

export default async function prompts(question: ConfirmQuestion, options?: Options): Promise<Record<string, boolean>>
export default async function prompts(question: NumberQuestion, options?: Options): Promise<Record<string, number>>
export default async function prompts(question: TextQuestion, options?: Options): Promise<Record<string, string>>
export default async function prompts(
  question: Question,
  options: Options = {}
): Promise<Record<string, string | number | boolean>> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    for (;;) {
      const suffix = question.type === 'confirm' ? (question.initial ? ' [Y/n] ' : ' [y/N] ') : ' '
      const answer = await rl.question(`${question.message}${suffix}`)
      if (question.type === 'confirm') {
        const value = answer === '' ? !!question.initial : /^y(es)?$/i.test(answer)
        return { [question.name]: value }
      }
      if (question.type === 'number') {
        const value = Number(answer)
        if (Number.isNaN(value)) {
          process.stdout.write('Please enter a number.\n')
          continue
        }
        if (!question.validate || (await question.validate(value))) return { [question.name]: value }
      } else if (!question.validate || (await question.validate(answer))) {
        return { [question.name]: answer }
      }
      process.stdout.write('Invalid input, please try again.\n')
    }
  } catch {
    options.onCancel?.()
    return {}
  } finally {
    rl.close()
  }
}

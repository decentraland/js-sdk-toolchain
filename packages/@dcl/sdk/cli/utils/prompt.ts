import inquirer from 'inquirer'

export async function confirm(message: string): Promise<boolean> {
  const { answer } = await inquirer.prompt({
    name: 'answer',
    message,
    type: 'confirm'
  })

  return answer
}

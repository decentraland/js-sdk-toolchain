export type CreateQuest = {
  name: string
  description: string
  imageUrl: string
  definition: QuestDefinition
  reward?: {
    hook: {
      webhookUrl: string
      requestBody?: Record<string, string>
    }
    items: { name: string; imageLink: string }[]
  }
}

export interface QuestDefinition {
  steps: Step[]
  connections: Connection[]
}

interface Connection {
  stepFrom: string
  stepTo: string
}

interface Step {
  id: string
  description: string
  tasks: Task[]
}

interface Action {
  type: string
  parameters: { [key: string]: string }
}

interface Task {
  id: string
  description: string
  actionItems: Action[]
}

export type QuestLinkerActionType = 'create' | 'list' | 'activate' | 'deactivate'

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

export interface Connection {
  stepFrom: string
  stepTo: string
}

export interface Step {
  id: string
  description: string
  tasks: Task[]
}

export interface Action {
  type: string
  parameters: { [key: string]: string }
}

export interface Task {
  id: string
  description: string
  actionItems: Action[]
}

export type QuestLinkerActionType = 'create' | 'list' | 'activate' | 'deactivate'

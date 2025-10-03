export type DialogueContextItem = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type KnowledgeBaseSection = {
  heading: string
  facts: readonly string[]
}

import { fetch } from 'fetch'
import Headers from 'headers'

import type { Maybe } from 'stackchan-util'
import structuredClone from 'structuredClone'

import { createDefaultContext } from './knowledge-base'
import type { DialogueContextItem } from './types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-3-haiku-20240307'

type ChatContent = DialogueContextItem

function isChatContent(c): c is ChatContent {
  return (
    c != null &&
    'role' in c &&
    (c.role === 'assistant' || c.role === 'user' || c.role === 'system') &&
    typeof c.content === 'string'
  )
}

type ClaudeDialogueProps = {
  context?: ReadonlyArray<ChatContent>
  model?: string
  apiKey: string
}

export class ClaudeDialogue {
  #apiKey: string
  #model: string
  #context: Array<ChatContent>
  #system: string
  #history: Array<ChatContent>
  #maxHistory: number
  constructor({ apiKey, model = DEFAULT_MODEL, context }: ClaudeDialogueProps) {
    this.#apiKey = apiKey
    this.#model = model
    const baseContext = (context ?? createDefaultContext()).map((item) => ({ ...item }))
    this.#system = baseContext
      .filter((c) => c.role === 'system')
      .map((c) => c.content)
      .join('\n')
    this.#context = baseContext.filter((c) => c.role !== 'system')
    // The first message of context must always use the user role.
    if (!this.#context.map((c) => c.role).includes('user')) {
      this.#context.unshift({
        role: 'user',
        content: "Let's talk together!",
      })
    }
    this.#history = []
    this.#maxHistory = 6
  }
  clear() {
    this.#history.splice(0)
  }
  async post(message: string): Promise<Maybe<string>> {
    const userMessage: ChatContent = {
      role: 'user',
      content: message,
    }
    try {
      const response = await this.#sendMessage(userMessage)
      if (isChatContent(response)) {
        this.#history.push(userMessage)
        this.#history.push(response)

        // Set maximum length to prevent memory overflow
        while (this.#history.length > this.#maxHistory) {
          this.#history.shift()
        }
        return {
          success: true,
          value: response.content,
        }
      }
      return { success: false, reason: 'Invalid response format' }
    } catch (error) {
      return { success: false, reason: error.message || 'Unknown error' }
    }
  }
  get history() {
    return structuredClone(this.#history)
  }
  async #sendMessage(message: ChatContent): Promise<unknown> {
    const body = {
      model: this.#model,
      max_tokens: 128,
      system: this.#system,
      messages: [...this.#context, ...this.#history, message],
    }
    return fetch(API_URL, {
      method: 'POST',
      headers: new Headers([
        ['Content-Type', 'application/json'],
        ['x-api-key', `${this.#apiKey}`],
        ['anthropic-version', '2023-06-01'],
      ]),
      body: JSON.stringify(body),
    })
      .then((response) => {
        const status = response.status
        if (2 !== Math.idiv(status, 100)) {
          throw Error(`http request failed, status ${status}`)
        }
        return response.arrayBuffer()
      })
      .then((buffer) => {
        const body = String.fromArrayBuffer(buffer)
        return JSON.parse(body)
      })
      .then((obj) => {
        return {
          role: obj.role,
          content: obj.content?.[0].text,
        }
      })
  }
}

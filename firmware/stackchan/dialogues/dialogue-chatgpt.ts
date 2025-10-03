import { fetch } from 'fetch'
import Headers from 'headers'

import type { Maybe } from 'stackchan-util'
import structuredClone from 'structuredClone'

import { createDefaultContext } from './knowledge-base'
import type { DialogueContextItem } from './types'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

type ChatContent = DialogueContextItem

function isChatContent(c): c is ChatContent {
  return (
    c != null &&
    'role' in c &&
    (c.role === 'assistant' || c.role === 'user' || c.role === 'system') &&
    typeof c.content === 'string'
  )
}

type ChatGPTDialogueProps = {
  context?: ReadonlyArray<ChatContent>
  model?: string
  apiKey: string
}

export class ChatGPTDialogue {
  #apiKey
  #model: string
  #context: Array<ChatContent>
  #history: Array<ChatContent>
  #maxHistory: number
  constructor({ apiKey, model = DEFAULT_MODEL, context }: ChatGPTDialogueProps) {
    this.#apiKey = apiKey
    this.#model = model
    const baseContext = (context ?? createDefaultContext()).map((item) => ({ ...item }))
    this.#context = baseContext
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
      messages: [...this.#context, ...this.#history, message],
    }
    return fetch(API_URL, {
      method: 'POST',
      headers: new Headers([
        ['Content-Type', 'application/json'],
        ['Authorization', `Bearer ${this.#apiKey}`],
      ]),
      body: JSON.stringify(body),
    })
      .then((response) => {
        const status = response.status
        if (2 !== Math.idiv(status, 100)) {
          throw Error(`http·requestfailed, status ${status}`)
        }
        return response.arrayBuffer()
      })
      .then((buffer) => {
        const body = String.fromArrayBuffer(buffer)
        return JSON.parse(body, ['choices', 'message', 'role', 'content'])
      })
      .then((obj) => {
        return obj.choices?.[0].message
      })
  }
}

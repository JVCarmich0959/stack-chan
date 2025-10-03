import { fetch } from 'fetch'
import Headers from 'headers'

import type { Maybe } from 'stackchan-util'
import structuredClone from 'structuredClone'

import { createDefaultContext } from './knowledge-base'
import type { DialogueContextItem } from './types'

const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/'
const DEFAULT_MODEL = 'gemini-1.5-flash-latest'

function isContent(c): c is Content {
  return (
    c != null &&
    Array.isArray(c.parts) &&
    c.parts.length > 0 &&
    typeof c.parts[0].text === 'string' &&
    ['model', 'user'].includes(c.role)
  )
}

type ChatContent = DialogueContextItem

type GeminiDialogueProps = {
  context?: ReadonlyArray<ChatContent>
  model?: string
  apiKey: string
}

type Content = {
  role?: 'user' | 'model'
  parts: {
    text: string
  }[]
}

export class GeminiDialogue {
  #apiKey: string
  #model: string
  #context: Array<Content>
  #system: Content
  #history: Array<Content>
  #maxHistory: number
  constructor({ apiKey, model = DEFAULT_MODEL, context }: GeminiDialogueProps) {
    this.#model = model
    const baseContext = (context ?? createDefaultContext()).map((item) => ({ ...item }))
    this.#system = {
      parts: baseContext.filter((c) => c.role === 'system').map((c) => ({ text: c.content })),
    }
    this.#context = baseContext
      .filter((c) => c.role !== 'system')
      .map((c) => ({
        parts: [{ text: c.content }],
        role: c.role === 'assistant' ? 'model' : 'user',
      }))
    this.#apiKey = apiKey
    this.#history = []
    this.#maxHistory = 6
  }
  clear() {
    this.#history.splice(0)
  }
  async post(message: string): Promise<Maybe<string>> {
    const userMessage: Content = {
      role: 'user',
      parts: [
        {
          text: message,
        },
      ],
    }
    try {
      const response = await this.#sendMessage(userMessage)
      if (isContent(response)) {
        this.#history.push(userMessage)
        this.#history.push(response)

        // Set maximum length to prevent memory overflow
        while (this.#history.length > this.#maxHistory) {
          this.#history.shift()
        }
        return {
          success: true,
          value: response.parts[0]?.text,
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
  async #sendMessage(message: Content): Promise<unknown> {
    const body = {
      systemInstruction: this.#system,
      contents: [...this.#context, ...this.#history, message],
    }
    return fetch(`${API_URL_BASE}${this.#model}:generateContent?key=${this.#apiKey}`, {
      method: 'POST',
      headers: new Headers([['Content-Type', 'application/json']]),
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
        return JSON.parse(body, ['candidates', 'content', 'parts', 'role', 'text'])
      })
      .then((obj) => {
        return obj.candidates[0]?.content
      })
  }
}

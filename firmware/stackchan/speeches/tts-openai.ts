/* eslint-disable prefer-const */
import OpenAIStreamer from 'openaistreamer'
import { BaseTTS, type BaseTTSProps } from 'tts-base'

/* global trace, SharedArrayBuffer */

export type TTSProperty = BaseTTSProps & {
  token: string
  model?: string
  voice?: string
  speed?: number
  instructions?: string
}

export class TTS extends BaseTTS {
  token: string
  model: string
  voice: string
  speed: number
  instructions: string
  constructor(props: TTSProperty) {
    super(props)
    this.token = props.token
    this.model = props.model ?? 'tts-1'
    this.voice = props.voice ?? 'alloy'
    this.speed = props.speed ?? 1
    this.instructions = props.instructions ?? ''
  }
  async stream(text: string, volume?: number): Promise<void> {
    return this.play(
      (audio, hooks) =>
        new OpenAIStreamer({
          input: text,
          key: this.token,
          model: this.model,
          voice: this.voice,
          speed: this.speed,
          instructions: this.instructions,
          response_format: 'wav',
          audio: {
            out: audio,
            stream: 0,
          },
          onPlayed: hooks.onPlayed,
          onReady: hooks.onReady,
          onError: hooks.onError,
          onDone: hooks.onDone,
        }),
      volume,
      { bitsPerSample: 16, sampleRate: 24000 },
    )
  }
}

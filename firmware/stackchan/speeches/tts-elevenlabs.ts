/* eslint-disable prefer-const */
import ElevenLabsStreamer from 'elevenlabsstreamer'
import { BaseTTS, type BaseTTSProps } from 'tts-base'

/* global trace, SharedArrayBuffer */

type voiceSettings = {
  similarity_boost: number
  stability: number
  style?: number
  use_speaker_boost?: boolean
}

export type TTSProperty = BaseTTSProps & {
  token: string
  voice?: string
  latency?: number
  format?: string
  model?: string
  voice_settings?: voiceSettings
}

export class TTS extends BaseTTS {
  token: string
  model: string
  voice: string
  latency: number
  format: string
  voice_settings: voiceSettings
  constructor(props: TTSProperty) {
    super(props)
    this.token = props.token
    this.latency = props.latency ?? 2
    this.format = props.format ?? 'mp3_44100_64'
    this.model = props.model ?? 'eleven_monolingual_v1'
    this.voice = props.voice ?? 'AZnzlk1XvdvUeBnXmlld'
    this.voice_settings = props.voice_settings
  }

  async stream(text: string, volume?: number): Promise<void> {
    return this.play(
      (audio, hooks) =>
        new ElevenLabsStreamer({
          key: this.token,
          voice: this.voice,
          model: this.model,
          latency: this.latency,
          format: this.format,
          voice_settings: this.voice_settings,
          text,
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
      { bitsPerSample: 16, sampleRate: 44100 },
    )
  }
}

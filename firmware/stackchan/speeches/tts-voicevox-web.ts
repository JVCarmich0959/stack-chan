/* eslint-disable prefer-const */
import MP3Streamer from 'mp3streamer'
import { BaseTTS, type BaseTTSProps } from 'tts-base'
import { fetch } from 'fetch'
import { URL } from 'url'
import type HTTPClient from 'embedded:network/http/client'

/* global trace, SharedArrayBuffer */
declare const device: {
  network: {
    https: typeof HTTPClient.constructor & {
      io: typeof HTTPClient
      socket: unknown
      dns: unknown
    }
  }
}

export type TTSProperty = BaseTTSProps & {
  token: string
  sampleRate?: number
  speakerId?: number
}

export class TTS extends BaseTTS {
  token: string
  streaming: boolean
  speakerId: number
  sampleRate?: number
  constructor(props: TTSProperty) {
    super(props)
    this.streaming = false
    this.speakerId = props.speakerId ?? 1
    this.token = props.token
  }

  async getQuery(text: string, speakerId = 1): Promise<string> {
    return fetch(
      encodeURI(`https://api.tts.quest/v3/voicevox/synthesis?key=${this.token}&text=${text}&speaker=${speakerId}`),
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`response error:${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        trace(`isApiKeyValid: ${data.isApiKeyValid}\n`)
        trace(`mp3StreamingUrl: ${data.mp3StreamingUrl}\n`)
        return data.mp3StreamingUrl
      })
  }

  async stream(key: string, volume?: number): Promise<void> {
    if (this.streaming) {
      throw new Error('already playing')
    }
    this.streaming = true

    const speakerId = this.speakerId
    const streamUrl = await this.getQuery(key, speakerId).catch((error) => {
      throw new Error(`getQuery failed: ${error}`)
    })
    const url = new URL(streamUrl)

    return this.play(
      (audio, hooks) =>
        new MP3Streamer({
          http: device.network.https,
          host: url.host,
          path: url.pathname,
          port: 443,
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
      { bitsPerSample: 16, sampleRate: this.sampleRate ?? 22050 },
    )
  }
}

/* eslint-disable prefer-const */
import WavStreamer from 'wavstreamer'
import { BaseTTS, type BaseTTSProps } from 'tts-base'
import type HTTPClient from 'embedded:network/http/client'

/* global trace, SharedArrayBuffer */
declare const device: {
  network: {
    http: typeof HTTPClient.constructor & {
      io: typeof HTTPClient
      socket: unknown
      dns: unknown
    }
  }
}

export type TTSProperty = BaseTTSProps & {
  host: string
  port: number
}

export class TTS extends BaseTTS {
  host: string
  port: number
  constructor(props: TTSProperty) {
    super(props)
    this.host = props.host
    this.port = props.port
    this.sampleRate = props.sampleRate ?? 24000
  }

  async stream(key: string, volume?: number): Promise<void> {
    return this.play(
      (audio, hooks) =>
        new WavStreamer({
          http: device.network.http,
          host: this.host,
          path: key,
          port: this.port,
          bufferDuration: 600,
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
    )
  }
}

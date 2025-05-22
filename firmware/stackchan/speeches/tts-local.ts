/* eslint-disable prefer-const */
import ResourceStreamer from 'resourcestreamer'
import { BaseTTS, type BaseTTSProps, type StreamHooks } from 'tts-base'

/* global trace, SharedArrayBuffer */

export type TTSProperty = BaseTTSProps

export class TTS extends BaseTTS {
  async stream(key: string, volume?: number): Promise<void> {
    return this.play(
      (audio, hooks) =>
        new ResourceStreamer({
          path: `${key}.maud`,
          audio: {
            out: audio,
            stream: 0,
            sampleRate: this.sampleRate,
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

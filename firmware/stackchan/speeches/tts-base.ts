import AudioOut from 'pins/audioout'
import calculatePower from 'calculate-power'

export type BaseTTSProps = {
  onPlayed?: (power: number) => void
  onDone?: () => void
  sampleRate?: number
  volume?: number
}

export type StreamHooks = {
  onPlayed(buffer: ArrayBuffer): void
  onReady(state: boolean): void
  onError(error: unknown): void
  onDone(): void
}

export abstract class BaseTTS {
  protected audio?: AudioOut
  protected onPlayed?: (power: number) => void
  protected onDone?: () => void
  protected sampleRate: number
  protected volume: number
  protected streaming = false

  constructor(props: BaseTTSProps) {
    this.onPlayed = props.onPlayed
    this.onDone = props.onDone
    this.sampleRate = props.sampleRate ?? 11025
    this.volume = props.volume ?? 0.5
  }

  protected async play(
    createStreamer: (audio: AudioOut, hooks: StreamHooks) => { close?: () => void },
    volume?: number,
    audioOptions: Record<string, number> = {},
  ): Promise<void> {
    if (this.streaming) throw new Error('already playing')
    this.streaming = true
    return new Promise((resolve, reject) => {
      this.audio = new AudioOut({ streams: 1, sampleRate: this.sampleRate, ...audioOptions })
      this.audio.enqueue(0, AudioOut.Volume, Math.round((volume ?? this.volume) * 256))
      const audio = this.audio
      const cleanup = () => {
        this.streaming = false
        streamer?.close?.()
        this.audio?.close()
        this.audio = undefined
        this.onDone?.()
      }
      const hooks: StreamHooks = {
        onPlayed: (buffer) => {
          const power = calculatePower(buffer)
          this.onPlayed?.(power)
        },
        onReady: (state) => {
          trace(`Ready: ${state}\n`)
          if (state) {
            audio.start()
          } else {
            audio.stop()
          }
        },
        onError: (e) => {
          cleanup()
          reject(e)
        },
        onDone: () => {
          cleanup()
          resolve()
        },
      }
      const streamer = createStreamer(audio, hooks)
    })
  }
}

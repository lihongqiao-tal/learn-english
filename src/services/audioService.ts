
import { GoogleGenAI, Modality, Blob, LiveServerMessage } from '@google/genai';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export class TranscriptionService {
  private ai: any;
  private sessionPromise: Promise<any> | null = null;
  private onTranscription: (text: string, isFinal: boolean) => void;
  private currentTranscription = '';

  constructor(onTranscription: (text: string, isFinal: boolean) => void) {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    this.onTranscription = onTranscription;
  }

  async start() {
    this.currentTranscription = '';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            this.sessionPromise?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            this.currentTranscription += text;
            this.onTranscription(this.currentTranscription, false);
          }
          if (message.serverContent?.turnComplete) {
            this.onTranscription(this.currentTranscription, true);
          }
        },
        onerror: (e: any) => console.error('Live API Error:', e),
        onclose: () => console.log('Live API Closed'),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
      },
    });
  }

  async stop() {
    this.sessionPromise?.then(session => session.close());
    this.sessionPromise = null;
  }
}

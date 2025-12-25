// 使用 OpenAI Whisper 风格的批量音频转录
export class TranscriptionService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onTranscription: (text: string, isFinal: boolean) => void;
  private stream: MediaStream | null = null;

  constructor(onTranscription: (text: string, isFinal: boolean) => void) {
    this.onTranscription = onTranscription;
  }

  async start() {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 使用 webm 格式录音
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      await this.transcribeAudio(audioBlob);
    };

    this.mediaRecorder.start();
    console.log('Recording started...');
  }

  async stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('Recording stopped, transcribing...');
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private async transcribeAudio(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1'); // 根据你的服务调整模型名称

      const response = await fetch('/api/openai-compatible/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'api-key': `${import.meta.env.VITE_TAL_MLOPS_APP_ID}:${import.meta.env.VITE_TAL_MLOPS_APP_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';
      
      // 调用回调，标记为最终结果
      this.onTranscription(text, true);
    } catch (error) {
      console.error('Transcription error:', error);
      this.onTranscription('转录失败，请重试', true);
    }
  }
}

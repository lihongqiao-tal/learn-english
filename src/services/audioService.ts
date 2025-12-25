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
      mimeType: "audio/webm",
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
      await this.transcribeAudio(audioBlob);
    };

    this.mediaRecorder.start();
    console.log("Recording started...");
  }

  async stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      console.log("Recording stopped, transcribing...");
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // 移除 data:audio/webm;base64, 前缀
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async transcribeAudio(audioBlob: Blob) {
    try {
      // 将音频转换为base64
      const base64Audio = await this.blobToBase64(audioBlob);

      const response = await fetch(
        "/api/openai-compatible/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": `${import.meta.env.VITE_TAL_MLOPS_APP_ID}:${
              import.meta.env.VITE_TAL_MLOPS_APP_KEY
            }`,
          },
          body: JSON.stringify({
            model: "gemini-3-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please transcribe this audio file. Return only the transcribed text without any additional explanation.",
                  },
                  {
                    type: "input_audio",
                    input_audio: {
                      data: base64Audio,
                      format: "webm",
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transcription error response:", errorText);
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Transcription response:", data);

      // 提取文本结果
      const text = data.choices?.[0]?.message?.content || data.text || "";

      // 调用回调，标记为最终结果
      this.onTranscription(text, true);
    } catch (error) {
      console.error("Transcription error:", error);
      this.onTranscription("转录失败，请重试", true);
    }
  }
}

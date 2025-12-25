// 使用浏览器自带的 Web Speech API 进行实时语音识别
export class TranscriptionService {
  private recognition: any = null;
  private onTranscription: (text: string, isFinal: boolean) => void;
  private finalTranscript: string = "";
  private interimTranscript: string = "";

  constructor(onTranscription: (text: string, isFinal: boolean) => void) {
    this.onTranscription = onTranscription;
    this.initRecognition();
  }

  private initRecognition() {
    // 检查浏览器是否支持 Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器");
      return;
    }

    this.recognition = new SpeechRecognition();

    // 配置语音识别
    this.recognition.lang = "en-US"; // 识别英语
    this.recognition.continuous = true; // 持续识别
    this.recognition.interimResults = true; // 显示临时结果
    this.recognition.maxAlternatives = 1;

    // 监听识别结果
    this.recognition.onresult = (event: any) => {
      this.interimTranscript = "";

      // 遍历所有识别结果
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // 最终结果
          this.finalTranscript += transcript + " ";
        } else {
          // 临时结果
          this.interimTranscript += transcript;
        }
      }

      // 发送当前识别的文本（最终结果 + 临时结果）
      const currentText = (
        this.finalTranscript + this.interimTranscript
      ).trim();
      this.onTranscription(currentText, false);
    };

    // 识别结束事件
    this.recognition.onend = () => {
      console.log("识别结束");
      // 发送最终结果
      if (this.finalTranscript.trim()) {
        this.onTranscription(this.finalTranscript.trim(), true);
      }
    };

    // 错误处理
    this.recognition.onerror = (event: any) => {
      console.error("语音识别错误:", event.error);

      let errorMessage = "识别失败，请重试";
      switch (event.error) {
        case "no-speech":
          errorMessage = "未检测到语音，请重试";
          break;
        case "audio-capture":
          errorMessage = "无法访问麦克风";
          break;
        case "not-allowed":
          errorMessage = "请允许使用麦克风权限";
          break;
        case "network":
          errorMessage = "网络错误，请检查网络连接";
          break;
      }

      this.onTranscription(errorMessage, true);
    };

    this.recognition.onstart = () => {
      console.log("语音识别已启动...");
    };
  }

  async start() {
    if (!this.recognition) {
      this.onTranscription("浏览器不支持语音识别，请使用 Chrome 或 Edge", true);
      return;
    }

    try {
      // 重置转录文本
      this.finalTranscript = "";
      this.interimTranscript = "";

      // 开始识别
      this.recognition.start();
      console.log("开始录音和识别...");
    } catch (error) {
      console.error("启动识别失败:", error);
      this.onTranscription("启动失败，请重试", true);
    }
  }

  async stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log("停止识别...");
      } catch (error) {
        console.error("停止识别失败:", error);
      }
    }
  }
}

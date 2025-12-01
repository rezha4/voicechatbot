import { pipeline } from "@huggingface/transformers";

let sttPipeline = null;

const initializePipeline = async () => {
  console.log("initializing...");
  try {
    sttPipeline = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en"
    );

    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({ type: "error", error: String(error) });
  }
};

const transcribeAudio = async (audioData) => {
  if (!sttPipeline) throw new Error("STT model not initialized");

  const result = await sttPipeline(audioData);
  return result.text;
};

self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case "initialize":
        await initializePipeline();
        break;

      case "stt":
        const text = await transcribeAudio(data.audio);
        console.log(text);
        self.postMessage({ type: "transcription", data: { text } });
        break;
    }
  } catch (error) {
    self.postMessage({ type: "errorz", error: String(error) });
  }
});

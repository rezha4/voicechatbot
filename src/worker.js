import { pipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

let sttPipeline = null;
let llmPipeline = null;
let ttsPipeline = null;

const createProgressCallback = (modelName) => (progress) => {
  if (progress.status === "progress") {
    self.postMessage({
      type: "progress",
      data: {
        model: modelName,
        file: progress.file,
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total,
      },
    });
  } else if (progress.status === "initiate") {
    self.postMessage({
      type: "status",
      data: {
        model: modelName,
        status: "downloading",
        file: progress.file,
      },
    });
  } else if (progress.status === "done") {
    self.postMessage({
      type: "status",
      data: {
        model: modelName,
        status: "loaded",
        file: progress.file,
      },
    });
  }
};

const initializePipeline = async () => {
  const hasWebGPU =
    typeof navigator !== "undefined" && "gpu" in navigator;
  const device = hasWebGPU ? "webgpu" : "wasm";

  console.log(`Using device: ${device}`);

  try {
    self.postMessage({
      type: "status",
      data: { status: "loading", model: "stt", device },
    });
    sttPipeline = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
      {
        device,
        progress_callback: createProgressCallback("stt"),
      }
    );

    self.postMessage({
      type: "status",
      data: { status: "loading", model: "llm", device },
    });
    llmPipeline = await pipeline(
      "text-generation",
      "onnx-community/Llama-3.2-1B-Instruct",
      {
        dtype: "q4f16",
        device: "webgpu",
        progress_callback: createProgressCallback("llm"),
      }
    );

    self.postMessage({
      type: "status",
      data: { status: "loading", model: "tts", device },
    });
    ttsPipeline = await KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-ONNX",
      {
        dtype: "fp32",
        device,
        progress_callback: createProgressCallback("tts"),
      }
    );

    try {
      console.log("Warming up TTS shaders...");
      await ttsPipeline.generate("OK", { voice: "af_bella" });
      console.log("Warmup complete");
    } catch (e) {
      console.log("Warmup failed (non-fatal)", e);
    }
    self.postMessage({ type: "ready", data: { device } });
  } catch (error) {
    self.postMessage({ type: "error", error: String(error) });
  }
};

const transcribeAudio = async (audioData) => {
  if (!sttPipeline) throw new Error("STT model not initialized");

  self.postMessage({
    type: "status",
    data: { status: "transcribing" },
  });
  const result = await sttPipeline(audioData);
  return result.text;
};

const generateLLMResponse = async (text) => {
  if (!llmPipeline) throw new Error("LLM model not initialized");

  self.postMessage({
    type: "status",
    data: { status: "generating" },
  });

  const messages = [
    {
      role: "system",
      content:
        "You are a friendly chat partner. Keep responses open ended. Answer in a single short sentence.",
    },
    { role: "user", content: text },
  ];

  const result = await llmPipeline(messages, {
    max_new_tokens: 64,
    temperature: 0.7,
    do_sample: true,
    top_p: 0.95,
    repetition_penalty: 1.1,
  });

  const generatedText = result[0].generated_text;
  const assistantResponse =
    generatedText.at(-1)?.content || generatedText;

  return assistantResponse;
};

const generateSpeech = async (text) => {
  if (!ttsPipeline) throw new Error("TTS model not initialized");
  console.log("generating speech");

  self.postMessage({
    type: "status",
    data: { status: "synthesizing" },
  });

  const audio = await ttsPipeline.generate(text, {
    voice: "af_bella",
  });
  console.log("audio", audio);

  const wavBlob = audio.toBlob();

  self.postMessage({
    type: "audio",
    data: { blob: wavBlob, text },
  });

  return audio;
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
        self.postMessage({ type: "transcription", data: { text } });

        const response = await generateLLMResponse(text);
        self.postMessage({ type: "llmResponse", data: { response } });

        await generateSpeech(response);
        self.postMessage({ type: "complete" });
        break;

      case "tts-only":
        await generateSpeech(data.text);
        self.postMessage({ type: "complete" });
        break;
    }
  } catch (error) {
    self.postMessage({ type: "error", error: String(error) });
  }
});

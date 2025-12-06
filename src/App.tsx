import { useEffect, useRef, useState } from "react";

function App() {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [llmText, setLlmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState({
    model: null,
    progress: 0,
  });

  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("worker.js", import.meta.url),
        {
          type: "module",
        }
      );
    }

    worker.current.addEventListener("message", (e) => {
      const { type, data, error } = e.data;

      console.log(type);
      console.log(data);

      switch (type) {
        case "progress":
          setLoadingStatus({
            model: data.model,
            progress: data.progress,
          });
          break;

        case "ready":
          setLoading(false);
          setLoadingStatus({ model: null, progress: 100 });
          setReady(true);
          break;

        case "transcription":
          setUserText(data.text);
          break;

        case "complete":
          setIsProcessing(false);
          break;

        case "llmResponse":
          setLlmText(data.response);
          break;

        case "audio": {
          const url = URL.createObjectURL(data.blob);

          const audio = new Audio(url);
          audio.play();

          audio.onended = () => URL.revokeObjectURL(url);

          break;
        }

        case "error":
          console.error("Worker error:", error);
          setIsProcessing(false);
          break;
      }
    });
  }, []);

  const handleStartSession = () => {
    worker.current?.postMessage({ type: "initialize" });
    setLoading(true);
  };

  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startListening = async () => {
    setIsListening(true);
    setUserText("");

    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      const source =
        audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mediaRecorderRef.current = { stream, source, processor } as any;
    } catch (error) {
      console.error("Microphone access error:", error);
    }
  };

  const stopListening = () => {
    setIsListening(false);

    if (mediaRecorderRef.current) {
      const { stream, source, processor } =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mediaRecorderRef.current as any;

      processor.disconnect();
      source.disconnect();
      stream
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());

      const totalLength = audioChunksRef.current.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const audioData = new Float32Array(totalLength);
      let offset = 0;

      for (const chunk of audioChunksRef.current) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(audioData);
      worker.current?.postMessage({
        type: "stt",
        data: { audio: audioData },
      });
    }
  };

  return (
    <div className="p-4 w-1/2 mx-auto space-y-4 text-center">
      <h1>voiceChatBot</h1>
      <p>converse with AI locally!</p>

      {loading && (
        <p>loading... please wait {loadingStatus.progress}</p>
      )}

      {!ready && (
        <button
          disabled={loading}
          className="btn w-1/2"
          onClick={handleStartSession}
        >
          start session
        </button>
      )}

      {ready && (
        <>
          <div>
            {isListening ? (
              <button
                disabled={isProcessing}
                className="btn btn-error"
                onClick={() => stopListening()}
              >
                stop listening
              </button>
            ) : (
              <button
                disabled={isProcessing}
                className="btn btn-primary"
                onClick={() => startListening()}
              >
                start listening
              </button>
            )}
          </div>

          {<p>{loadingStatus.progress}</p>}
          {userText && <p>you say: {userText}</p>}
          {llmText && <p>LLM responds: {llmText}</p>}
        </>
      )}
    </div>
  );
}

export default App;

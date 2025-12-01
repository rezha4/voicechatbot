import { useEffect, useRef, useState } from "react";

function App() {
  const [loading, setLoading] = useState(false);
  const [userText, setUserText] = useState("");

  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("worker.js", import.meta.url),
        {
          type: "module",
        }
      );

      console.log(worker);
    }

    worker.current.addEventListener("message", (e) => {
      const { type, data } = e.data;

      console.log(type);
      console.log(data);

      switch (type) {
        case "ready":
          setLoading(false);
          break;

        case "transcription":
          setUserText(data.text);
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

      mediaRecorderRef.current = { stream, source, processor } as any;
    } catch (error) {
      console.error("Microphone access error:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current) {
      const { stream, source, processor } =
        mediaRecorderRef.current as any;

      processor.disconnect();
      source.disconnect();
      stream
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());

      // Concatenate all audio chunks
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

      {loading && <p>loading... please wait</p>}

      <button
        disabled={loading}
        className="btn w-1/2"
        onClick={handleStartSession}
      >
        start session
      </button>

      <div>
        <button className="btn" onClick={startListening}>
          start listening
        </button>
        <button className="btn" onClick={stopListening}>
          stop listening
        </button>
      </div>

      <p>you say: {userText}</p>
    </div>
  );
}

export default App;

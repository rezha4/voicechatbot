import { useRef, useCallback } from "react";

export const useAudioRecorder = () => {
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Create AudioContext
      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      // Load the AudioWorklet module from public folder
      await audioContextRef.current.audioWorklet.addModule(
        "/recorder-worklet.js"
      );

      // Create the AudioWorkletNode
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "recorder-worklet"
      );

      // Listen for audio data from the worklet
      workletNodeRef.current.port.onmessage = (event) => {
        const { channelData } = event.data;
        audioChunksRef.current.push(new Float32Array(channelData));
      };

      // Create source from microphone stream
      const source =
        audioContextRef.current.createMediaStreamSource(stream);

      // Connect: source -> worklet
      source.connect(workletNodeRef.current);

      console.log("Recording started");
    } catch (error) {
      console.error("Microphone access error:", error);
      throw error;
    }
  }, []);

  const stopListening = useCallback(() => {
    // Disconnect and clean up
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.close();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    console.log(
      `Stopped. Captured ${audioChunksRef.current.length} chunks`
    );
  }, []);

  const getAudioChunks = useCallback(() => {
    return audioChunksRef.current;
  }, []);

  return {
    startListening,
    stopListening,
    getAudioChunks,
  };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import LanguageSelector from "./components/language-selector";
import Progress from "./components/progress";

function App() {
  // Model loading
  const [ready, setReady] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState<any[]>([]);

  // Inputs and outputs
  const [input, setInput] = useState("I love walking my dog.");
  const [sourceLanguage, setSourceLanguage] = useState("eng_Latn");
  const [targetLanguage, setTargetLanguage] = useState("fra_Latn");
  const [output, setOutput] = useState("");

  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // Create the worker if it does not yet exist.
    worker.current ??= new Worker(
      new URL("./worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: any) => {
      switch (e.data.status) {
        case "initiate":
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case "update":
          // Generation update: update the output text.
          setOutput((o) => o + e.data.output);
          break;

        case "complete":
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current?.removeEventListener(
        "message",
        onMessageReceived
      );
  });

  const translate = () => {
    setDisabled(true);
    setOutput("");
    worker.current?.postMessage({
      text: input,
      src_lang: sourceLanguage,
      tgt_lang: targetLanguage,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
        Transformers.js
      </h1>
      <h2 className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
        ML-powered multilingual translation in React!
      </h2>

      {/* Main Content Wrapper */}
      <div className="w-full max-w-4xl space-y-6">
        {/* Language Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LanguageSelector
            type={"Source"}
            defaultLanguage={"eng_Latn"}
            onChange={(x) => setSourceLanguage(x.target.value)}
          />
          <LanguageSelector
            type={"Target"}
            defaultLanguage={"fra_Latn"}
            onChange={(x) => setTargetLanguage(x.target.value)}
          />
        </div>

        {/* Text Areas Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-40 text-gray-700 placeholder-gray-400 bg-white"
            placeholder="Enter text here..."
            value={input}
            rows={3}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>

          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-700 h-40 resize-none focus:outline-none cursor-default"
            value={output}
            rows={3}
            readOnly
            placeholder="Translation will appear here..."
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            disabled={disabled}
            onClick={translate}
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Translate
          </button>
        </div>

        {/* Progress Updates */}
        <div className="w-full max-w-lg mx-auto mt-6 space-y-2">
          {ready === false && (
            <label className="block text-sm font-medium text-gray-500 text-center animate-pulse">
              Loading models... (only runs once)
            </label>
          )}
          {progressItems.map((data) => (
            <div key={data.file}>
              <Progress text={data.file} percentage={data.progress} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

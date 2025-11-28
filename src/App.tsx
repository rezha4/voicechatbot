import { useEffect, useRef, useState } from "react";

function App() {
  const [originalLang, setOriginalLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [targetText, setTargetText] = useState("");
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL("worker.js", import.meta.url), {
        type: "module",
      });
    }

    worker.current.addEventListener("message", (e) =>
      setTargetText(JSON.stringify(e.data)),
    );

    const onMessageReceived = () => {};

    return () => {
      worker.current?.removeEventListener("message", onMessageReceived);
    };
  }, []);

  const handleTranslate = () => {
    worker.current?.postMessage({
      text: originalText,
      src_lang: originalLang,
      tgt_lang: targetLang,
    });
  };

  return (
    <div className="p-4 w-1/2 mx-auto space-y-4 text-center">
      <h1>translate with AI in your browser (transformers.js)</h1>

      <div className="flex gap-4">
        <div className="flex gap-2 flex-col w-full">
          <label className="label" htmlFor="originalLang">
            original language
          </label>
          <input
            value={originalLang}
            onChange={(e) => setOriginalLang(e.target.value)}
            className="input"
            id="originalLang"
          />
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            className="textarea h-52"
          />
        </div>

        <div className="flex gap-2 flex-col w-full">
          <label className="label" htmlFor="originalLang">
            target language
          </label>
          <input
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="input"
            id="originalLang"
          />
          <textarea value={targetText} className="textarea h-52" disabled />
        </div>
      </div>

      <button className="btn w-1/2" onClick={handleTranslate}>
        translate!
      </button>
    </div>
  );
}

export default App;

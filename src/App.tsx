import { useEffect, useRef } from "react";

function App() {
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

    return () => {};
  }, []);

  return <p>hello</p>;
}

export default App;

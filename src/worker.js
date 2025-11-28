import { pipeline } from "@huggingface/transformers";

class Pipeline {
  static model = "Xenova/nllb-200-distilled-600M";
  static instance = null;

  /**
   * @param {string} text
   * @param {Object} { src_lang: string, tgt_lang: string }
   */
  static async getInstance() {
    this.instance ??= pipeline("translation", this.model);

    return this.instance;
  }
}

self.addEventListener("message", async (e) => {
  const { text, src_lang, tgt_lang } = e.data;

  const translator = await Pipeline.getInstance();

  const output = await translator(text, {
    src_lang,
    tgt_lang,
  });

  self.postMessage(output);
});

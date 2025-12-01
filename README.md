# VoiceChatBot
converse with AI directly in your machine

## Feature
- press start conversation -> initialize all models (speech-to-text, LLM, text-to-speech)
- conversation start
- press converse -> speech-to-text model listens
- speak... then press done -> text is fed to LLM
- answer from AI -> LLM answer is turned into voice (text-to-speech)
- converse again, speak, done, answer - this is the main conversation loop
- press end conversation and get transcript -> the whole conversation is in 1 state? necessary for LLM to generate
  better response (have the full context). but also they might struggle with context that are too large, maybe
  chunk it?

class RecorderWorkletProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length > 0) {
      const channelData = input[0];
      this.port.postMessage({
        channelData: channelData.slice(),
      });
    }

    return true;
  }
}

registerProcessor("recorder-worklet", RecorderWorkletProcessor);

// PC probe: speak two German sentences with the packed Martin model.
const sherpa_onnx = require("sherpa-onnx-node");
const path = require("path");

const out = path.join(__dirname, "out");
const config = {
  model: {
    kokoro: {
      model: path.join(out, "model.onnx"),
      voices: path.join(out, "voices.bin"),
      tokens: path.join(out, "tokens.txt"),
      dataDir: path.join(__dirname, "martin", "espeak-ng-data"),
      lexicon: "",
      lang: "de",
    },
    numThreads: 4,
    provider: "cpu",
    debug: 0,
  },
  maxNumSentences: 1,
};

const text = process.argv[2] ||
  "Hallo Georg. Du hast heute drei offene Aufgaben: Reifen wechseln, die Wallbox anmelden und den Zahnarzt anrufen. Die Buchung über 12,50 Euro liegt unter Finanzen.";

const t0 = Date.now();
const tts = new sherpa_onnx.OfflineTts(config);
const t1 = Date.now();
const audio = tts.generate({ text, sid: 0, speed: 1.1 });
const t2 = Date.now();
const file = path.join(out, "probe-martin.wav");
sherpa_onnx.writeWave(file, { samples: audio.samples, sampleRate: audio.sampleRate });
console.log(`load ${t1 - t0} ms, generate ${t2 - t1} ms, audio ${(audio.samples.length / audio.sampleRate).toFixed(1)} s at ${audio.sampleRate} Hz -> ${file}`);

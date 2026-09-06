// Checks that the WASM espeak-ng gives German IPA the way kokoro-onnx's
// phonemizer does (with stress marks, one line of IPA for the text).
import ESpeakNg from "espeak-ng";

const text = process.argv[2] || "Reifen wechseln bis Freitag. Die Wallbox kostet zwölf Euro fünfzig.";
const espeak = await ESpeakNg({
  arguments: ["--phonout", "out.txt", "--ipa=3", "-q", "-v", "de", text],
});
const ipa = espeak.FS.readFile("out.txt", { encoding: "utf8" });
console.log(JSON.stringify(ipa));

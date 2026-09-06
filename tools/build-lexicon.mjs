// Builds lexicon.txt (word + IPA per line) for the app's own G2P.
// Words: Leipzig deu_news_2023_300K (freq >= 2) plus every word of the
// Tatoeba German sentences. Pronunciation: eSpeak NG (WASM), German voice,
// IPA with stress, the way kokoro-onnx's phonemizer produced the training
// phonemes. One WASM instance reads the whole list from a file (-f): one
// input line per output line, as long as no line holds a sentence end.
// Usage: node build-lexicon.mjs [limit]
import ESpeakNg from "espeak-ng";
import fs from "fs";
import zlib from "zlib";

const limit = Number(process.argv[2] || 0);
const wordRe = /^[a-zäöüß][a-zäöüß-]*$/i;
const counts = new Map();

for (const line of fs.readFileSync("wordlists/deu_news_2023_300K/deu_news_2023_300K-words.txt", "utf8").split("\n")) {
  const [, word, freq] = line.split("\t");
  if (!word || !wordRe.test(word) || Number(freq) < 2) continue;
  const key = word.toLowerCase();
  counts.set(key, (counts.get(key) || 0) + Number(freq));
}
for (const line of fs.readFileSync("wordlists/deu_sentences.tsv", "utf8").split("\n")) {
  const text = line.split("\t")[2];
  if (!text) continue;
  for (const raw of text.split(/[^a-zäöüßA-ZÄÖÜ-]+/)) {
    const word = raw.replace(/^-+|-+$/g, "");
    if (!word || !wordRe.test(word)) continue;
    const key = word.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
let words = [...counts.keys()].sort();
if (limit) words = words.slice(0, limit);
console.log("words", words.length);

const t0 = Date.now();
const espeak = await ESpeakNg({
  arguments: ["--phonout", "out.txt", "--ipa=3", "-q", "-v", "de", "-f", "words.txt"],
  // A period makes every line its own sentence; bare lines get merged.
  preRun: [(m) => m.FS.writeFile("words.txt", words.map((w) => w + ".").join("\n") + "\n")],
});
const lines = espeak.FS.readFile("out.txt", { encoding: "utf8" }).replace(/\n$/, "").split("\n");
console.log("espeak", Date.now() - t0, "ms, lines", lines.length);
if (lines.length !== words.length) {
  console.error("line count differs from word count; first lines:", lines.slice(0, 5));
  process.exit(1);
}

const out = [];
words.forEach((w, i) => {
  const ipa = lines[i].replace(/[‍͡]/g, "").replace(/[.\s]+$/, "").trim();
  if (ipa) out.push(`${w} ${ipa}`);
});
fs.mkdirSync("out", { recursive: true });
const text = out.join("\n") + "\n";
fs.writeFileSync("out/lexicon.txt", text);
fs.writeFileSync("out/lexicon.txt.gz", zlib.gzipSync(text, { level: 9 }));
console.log("entries", out.length, "gz", fs.statSync("out/lexicon.txt.gz").size, "bytes");
console.log(out.slice(0, 3).join(" | "), "...", out.slice(-3).join(" | "));

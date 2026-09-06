// Turns the kokoro-onnx "Martin" files into what sherpa-onnx expects:
// tokens.txt from Kokoro's vocab, voices.bin from the npz, and the model
// metadata appended to a copy of the ONNX (protobuf lets repeated fields
// be appended, so the 326 MB graph is never parsed).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const dir = path.join(__dirname, "martin");
const out = path.join(__dirname, "out");
fs.mkdirSync(out, { recursive: true });

// 1. tokens.txt: "symbol id" per line, ordered by id.
const vocab = JSON.parse(fs.readFileSync(path.join(dir, "kokoro-config.json"), "utf8")).vocab;
const tokens = Object.entries(vocab).sort((a, b) => a[1] - b[1]).map(([k, i]) => `${k} ${i}`);
fs.writeFileSync(path.join(out, "tokens.txt"), tokens.join("\n") + "\n");
console.log("tokens", tokens.length);

// 2. voices.bin: every .npy inside the npz, raw float32 in file order.
function zipEntries(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central dir");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    entries.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : raw });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
function npy(buf) {
  if (buf.toString("latin1", 0, 6) !== "\x93NUMPY") throw new Error("not npy");
  const major = buf[6];
  const headerLen = major === 1 ? buf.readUInt16LE(8) : buf.readUInt32LE(8);
  const start = (major === 1 ? 10 : 12) + headerLen;
  const header = buf.toString("latin1", major === 1 ? 10 : 12, start);
  const shape = header.match(/'shape':\s*\(([^)]*)\)/)[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  if (!header.includes("'<f4'")) throw new Error("expected float32: " + header);
  if (header.includes("'fortran_order': True")) throw new Error("fortran order");
  return { shape, data: buf.subarray(start) };
}
const npz = zipEntries(fs.readFileSync(path.join(dir, "voices-martin.npz")));
const voices = npz.map((e) => ({ name: e.name.replace(/\.npy$/, ""), ...npy(e.data) }));
for (const v of voices) console.log("voice", v.name, v.shape, v.data.length / 4, "floats");
fs.writeFileSync(path.join(out, "voices.bin"), Buffer.concat(voices.map((v) => v.data)));

// 3. model.onnx = original + metadata_props (ModelProto field 14).
function varint(n) {
  const b = [];
  while (n > 127) { b.push((n & 127) | 128); n >>>= 7; }
  b.push(n);
  return Buffer.from(b);
}
function str(tag, s) {
  const b = Buffer.from(s, "utf8");
  return Buffer.concat([Buffer.from([tag]), varint(b.length), b]);
}
function entry(key, value) {
  const body = Buffer.concat([str(0x0a, key), str(0x12, value)]);
  return Buffer.concat([Buffer.from([0x72]), varint(body.length), body]);
}
const meta = {
  model_type: "kokoro",
  language: "German",
  has_espeak: "1",
  sample_rate: "24000",
  version: "2",
  voice: "de",
  style_dim: voices[0].shape.join(","),
  n_speakers: String(voices.length),
  speaker_names: voices.map((v) => v.name).join(","),
  model_url: "https://huggingface.co/Godelaune/Kokoro-82M-ONNX-German-Martin",
  license: "Apache-2.0",
  comment: "Kokoro-82M German fine-tune 'Martin' by Godelaune, packed for sherpa-onnx (Unora).",
};
const extra = Buffer.concat(Object.entries(meta).map(([k, v]) => entry(k, v)));
const src = path.join(dir, "kokoro-martin.onnx");
const dst = path.join(out, "model.onnx");
fs.copyFileSync(src, dst);
fs.appendFileSync(dst, extra);
console.log("model", fs.statSync(dst).size, "bytes, meta", extra.length, "bytes");

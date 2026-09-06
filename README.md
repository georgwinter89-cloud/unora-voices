# Unora voices

Offline German voice for the [Unora](https://bitsandbuilds.de) Android app.
The app downloads these files once, on the user's request, and runs them on
the phone with ONNX Runtime. Nothing here is executed on a server.

## Files (release `martin-1`)

| File | What | Size |
|---|---|---|
| `model.onnx` | Kokoro-82M, German fine-tune "Martin" by Godelaune, unchanged bytes | 326 MB |
| `voices.bin` | the Martin style vectors, raw little-endian float32, shape 510 × 256 | 0.5 MB |
| `lexicon.txt.gz` | German word → IPA phonemes, one `word phonemes` per line, lowercase keys | see release |

## Licenses

- `model.onnx`, `voices.bin`: Apache License 2.0.
  Fine-tune by Godelaune, https://huggingface.co/Godelaune/Kokoro-82M-ONNX-German-Martin,
  based on Kokoro-82M by hexgrad, https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0).
- `lexicon.txt.gz`: CC BY 4.0. Word list built from the Tatoeba German
  sentences (https://tatoeba.org, CC BY 2.0 FR) and the Leipzig Corpora
  Collection `deu_news_2023_300K` (https://wortschatz.uni-leipzig.de, CC BY 4.0).
  Pronunciations were generated once with eSpeak NG (GPL-3.0); the lexicon is
  its output and contains no eSpeak code or dictionary data.

The Unora app itself is not open source and does not contain eSpeak NG.

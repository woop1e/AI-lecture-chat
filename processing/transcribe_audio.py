import whisper
import json
import os
import torch

input_audio = "output/audio.wav"
output_text = "output/transcript.txt"
output_json = "output/transcript_segments.json"

os.makedirs("output", exist_ok=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

print("Loading Whisper model...")
model = whisper.load_model("small").to(device)

print("Transcribing audio with timestamps...")
result = model.transcribe(input_audio, language="en", verbose=False)

with open(output_text, "w", encoding="utf-8") as f:
    f.write(result["text"])
#for timecoded segments
segments = [
    {
        "start": round(seg["start"], 2),
        "end": round(seg["end"], 2),
        "text": seg["text"].strip()
    }
    for seg in result["segments"]
]

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(segments, f, indent=4, ensure_ascii=False)

print(f"\nTranscription done!\n- Text: {output_text}\n- Segments: {output_json}")

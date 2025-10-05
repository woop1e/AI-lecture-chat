import whisper
import os

input_audio = "output/audio.wav"
output_text = "output/transcript.txt"


os.makedirs("output", exist_ok=True)

print("Loading Whisper model (this may take some time)...")
model = whisper.load_model("small")

print("Transcribing audio...")
result = model.transcribe(input_audio, language="en")

with open(output_text, "w", encoding="utf-8") as f:
    f.write(result["text"])

print(f"Transcription completed! Saved to {output_text}")

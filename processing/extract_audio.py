import os, subprocess

input_video = "input/lecture.mp4"
output_audio = "output/audio.wav"

if not os.path.exists(input_video):
    raise FileNotFoundError(f"Video file not found: {input_video}")

os.makedirs("output", exist_ok=True)

print("Extracting audio from video...")
subprocess.run([
    "ffmpeg", "-i", input_video,
    "-vn", "-acodec", "pcm_s16le",
    "-ar", "16000", "-ac", "1", output_audio
], check=True)

print(f"Audio extracted to {output_audio}")

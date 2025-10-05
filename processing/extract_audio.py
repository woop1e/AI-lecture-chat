import subprocess
import os

input_video = "input/lecture.mp4"

output_audio = "output/audio.wav"

os.makedirs("processing/output", exist_ok=True)

# FFmpeg
command = [
    "ffmpeg",
    "-i", input_video,      # input file
    "-vn",                  
    "-acodec", "pcm_s16le", # audio codec
    "-ar", "16000",         
    "-ac", "1",             # mono channel
    output_audio
]

print("Extracting audio from video...")
subprocess.run(command, check=True)
print(f"Audio saved at: {output_audio}")

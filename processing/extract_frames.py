import cv2
import os
import json

# Get script directory
script_dir = os.path.dirname(os.path.abspath(__file__))

video_path = os.path.join(script_dir, "input/lecture.mp4")
frames_dir = os.path.join(script_dir, "output/frames")
meta_file = os.path.join(script_dir, "output/frames_timestamps.json")

os.makedirs(frames_dir, exist_ok=True)

frame_interval = 30  # seconds
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error: Could not open video")
    exit()

fps = int(cap.get(cv2.CAP_PROP_FPS))
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = frame_count / fps

print(f"FPS: {fps}, Frames: {frame_count}, Duration: {duration:.2f} sec")

frame_number = 0
saved = 0
next_capture_time = 0
frames_meta = []

while True:
    ret, frame = cap.read()
    if not ret:
        break

    current_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
    if current_time >= next_capture_time:
        frame_name = f"frame_{saved:04d}.jpg"
        frame_path = os.path.join(frames_dir, frame_name)
        cv2.imwrite(frame_path, frame)
        frames_meta.append({"frame": frame_name, "timestamp": round(current_time, 2)})
        print(f"Saved frame: {frame_name} at {current_time:.2f}s")
        saved += 1
        next_capture_time += frame_interval

cap.release()

with open(meta_file, "w", encoding="utf-8") as f:
    json.dump(frames_meta, f, indent=4)

print(f"\nDone! {saved} frames saved and timestamps written to {meta_file}")

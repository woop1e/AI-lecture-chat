import cv2
import os

video_path = "processing/input/lecture.mp4"
frames_dir = "processing/output/frames"

os.makedirs(frames_dir, exist_ok=True)

frame_interval = 30 

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

while True:
    ret, frame = cap.read()
    if not ret:
        break

    current_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0 

    if current_time >= next_capture_time:
        frame_name = f"frame_{saved:04d}.jpg"
        frame_path = os.path.join(frames_dir, frame_name)
        cv2.imwrite(frame_path, frame)
        print(f"Saved frame: {frame_name} at {current_time:.2f}s")
        saved += 1
        next_capture_time += frame_interval  

cap.release()
print(f"\nDone! Total {saved} frames saved in '{frames_dir}'")

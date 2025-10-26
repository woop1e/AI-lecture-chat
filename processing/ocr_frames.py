import pytesseract
from PIL import Image
import os
import json

# Set the path to Tesseract OCR
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

frames_dir = "output/frames"
timestamps_file = "output/frames_timestamps.json"
output_json = "output/ocr_with_timestamps.json"

# Load timestamps for each frame
with open(timestamps_file, "r", encoding="utf-8") as f:
    frame_times = {item["frame"]: item["timestamp"] for item in json.load(f)}

ocr_data = []

# Process each image frame
for filename in sorted(os.listdir(frames_dir)):
    if not filename.endswith(".jpg"):
        continue
    path = os.path.join(frames_dir, filename)
    print(f"Processing {filename}...")
    text = pytesseract.image_to_string(Image.open(path)).strip()
    if text:
        ocr_data.append({
            "frame": filename,
            "timestamp": frame_times.get(filename, None),
            "text": text
        })
        
# Save all OCR results to a JSON file
with open(output_json, "w", encoding="utf-8") as f:
    json.dump(ocr_data, f, indent=4, ensure_ascii=False)

print(f"\n OCR done! Saved to {output_json}")

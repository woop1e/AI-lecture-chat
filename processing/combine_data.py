import json
import os

transcript_file = "output/transcript_segments.json"
ocr_file = "output/ocr_with_timestamps.json"
output_file = "output/final_combined.json"

with open(transcript_file, "r", encoding="utf-8") as f:
    transcript_segments = json.load(f)

with open(ocr_file, "r", encoding="utf-8") as f:
    ocr_slides = json.load(f)

combined = []

for slide in ocr_slides:
    slide_time = slide.get("timestamp")
    slide_text = slide.get("text", "").strip()

    related_segments = [
        seg for seg in transcript_segments
        if seg["start"] <= slide_time <= seg["end"] or abs(seg["start"] - slide_time) < 20
    ]

    speech_text = " ".join(seg["text"].strip() for seg in related_segments)
    
    combined.append({
        "timestamp": slide_time,
        "slide_text": slide_text,
        "speech_text": speech_text,
        "frame": slide["frame"]
    })

os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(combined, f, indent=4, ensure_ascii=False)

print(f" Combined dataset saved to: {output_file}")
print(f"Contains {len(combined)} items (slide + speech pairs)")

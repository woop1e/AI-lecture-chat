import json
import os

<<<<<<< HEAD
script_dir = os.path.dirname(os.path.abspath(__file__))

transcript_file = os.path.join(script_dir, "output/transcript_segments.json")
ocr_file = os.path.join(script_dir, "output/ocr_with_timestamps.json")
output_file = os.path.join(script_dir, "output/final_combined.json")
=======
# Input and output file paths
transcript_file = "output/transcript_segments.json"
ocr_file = "output/ocr_with_timestamps.json"
output_file = "output/final_combined.json"
>>>>>>> 42d302a5b4d0afda503f4fc51fd027299a013dda

# Load transcript segments
with open(transcript_file, "r", encoding="utf-8") as f:
    transcript_segments = json.load(f)
    
# Load OCR slide data
with open(ocr_file, "r", encoding="utf-8") as f:
    ocr_slides = json.load(f)

combined = []

# Match each slide with related transcript segments
for slide in ocr_slides:
    slide_time = slide.get("timestamp")
    slide_text = slide.get("text", "").strip()
    
 # Find transcript parts that align with or are close to the slide timestamp
    related_segments = [
        seg for seg in transcript_segments
        if seg["start"] <= slide_time <= seg["end"] or abs(seg["start"] - slide_time) < 20
    ]
 # Combine text from matching transcript segments
    speech_text = " ".join(seg["text"].strip() for seg in related_segments)
    
    combined.append({
        "timestamp": slide_time,
        "slide_text": slide_text,
        "speech_text": speech_text,
        "frame": slide["frame"]
    })

os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Save the combined data as JSON
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(combined, f, indent=4, ensure_ascii=False)

print(f" Combined dataset saved to: {output_file}")
print(f"Contains {len(combined)} items (slide + speech pairs)")

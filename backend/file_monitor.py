import os
import json
import hashlib
import shutil
import zipfile
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time
from datetime import datetime

# Import your existing processor
from course_processor import EnhancedCourseProcessor

class CourseZipMonitor(FileSystemEventHandler):
    def __init__(self):
        self.upload_dir = Path("./course_uploads")
        self.processed_dir = Path("./course_uploads/processed")
        self.upload_dir.mkdir(exist_ok=True)
        self.processed_dir.mkdir(exist_ok=True)
        
        # Use your existing course processor
        self.processor = EnhancedCourseProcessor()
        self.processing = set()
        
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.zip'):
            print(f"📁 New ZIP detected: {event.src_path}")
            self.process_zip_with_change_detection(event.src_path)
    
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.zip'):
            print(f"🔄 ZIP modified: {event.src_path}")
            self.process_zip_with_change_detection(event.src_path)
    
    def process_zip_with_change_detection(self, zip_path: str):
        """Process ZIP with change detection using your existing processor"""
        zip_path = Path(zip_path)
        
        if str(zip_path) in self.processing:
            return
            
        self.processing.add(str(zip_path))
        
        try:
            time.sleep(2)  # Wait for file write to complete
            
            # Extract course info from filename
            course_id = self.extract_course_id(zip_path.name)
            
            # Check if we need to process
            if not self.needs_processing(zip_path, course_id):
                print(f"⏭️  No changes detected for {zip_path.name}")
                return
            
            # Create temp directory
            temp_dir = Path(f"./temp_extract_{course_id}_{int(time.time())}")
            
            try:
                # Extract ZIP
                print(f"📤 Extracting {zip_path.name}...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Use your existing processor methods
                print(f"🧠 Processing course structure...")
                courses = self.processor.parse_course_structure(str(temp_dir))
                
                if courses:
                    print(f"💾 Storing in Qdrant...")
                    self.processor.process_course_structure(courses, force_recreate=True)
                    
                    # Update metadata for change detection
                    self.save_processing_metadata(zip_path, course_id, courses)
                    
                    print(f"✅ Successfully processed {zip_path.name}")
                    for course in courses:
                        print(f"   📚 {course.course_name}: {len(course.lessons)} lessons")
                else:
                    print(f"⚠️  No valid course structure found")
            
            finally:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
                    
        except Exception as e:
            print(f"❌ Error processing {zip_path}: {e}")
        finally:
            self.processing.discard(str(zip_path))
    
    def extract_course_id(self, filename: str) -> str:
        """Extract course ID from filename"""
        stem = Path(filename).stem
        if '_' in stem:
            return stem.split('_', 1)[0].lower()
        return stem.lower()
    
    def needs_processing(self, zip_path: Path, course_id: str) -> bool:
        """Check if processing is needed based on file hash"""
        metadata_file = self.processed_dir / f"{course_id}.json"
        
        if not metadata_file.exists():
            return True
        
        current_hash = self.calculate_hash(zip_path)
        
        try:
            with open(metadata_file, 'r') as f:
                prev_data = json.load(f)
            return current_hash != prev_data.get('zip_hash')
        except:
            return True
    
    def calculate_hash(self, file_path: Path) -> str:
        """Calculate file hash"""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def save_processing_metadata(self, zip_path: Path, course_id: str, courses: list):
        """Save processing metadata"""
        metadata_file = self.processed_dir / f"{course_id}.json"
        
        metadata = {
            "course_id": course_id,
            "zip_path": str(zip_path.absolute()),
            "zip_hash": self.calculate_hash(zip_path),
            "processed_timestamp": datetime.now().isoformat(),
            "courses_processed": len(courses)
        }
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def start_monitoring(self):
        """Start the file system monitor"""
        print(f"🔍 Monitoring: {self.upload_dir.absolute()}")
        print(f"📋 To add courses: Copy ZIP files to {self.upload_dir.absolute()}")
        
        # Process existing files
        for zip_file in self.upload_dir.glob("*.zip"):
            self.process_zip_with_change_detection(str(zip_file))
        
        # Start monitoring
        observer = Observer()
        observer.schedule(self, str(self.upload_dir), recursive=False)
        observer.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()

if __name__ == "__main__":
    monitor = CourseZipMonitor()
    monitor.start_monitoring()
import threading
import subprocess
import sys
from file_monitor import CourseZipMonitor

def start_api():
    subprocess.run([sys.executable, "main.py"])

def start_monitor():
    monitor = CourseZipMonitor()
    monitor.start_monitoring()

if __name__ == "__main__":
    print("🚀 Starting AI Teaching Assistant")
    print(f"📁 Upload directory: ./course_uploads")
    print(f"🌐 API server: http://localhost:8000")
    
    # Start file monitor in background
    monitor_thread = threading.Thread(target=start_monitor)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    # Start API server
    start_api()
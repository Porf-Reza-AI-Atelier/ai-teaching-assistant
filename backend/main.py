from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import tempfile
import time
import zipfile
from pathlib import Path
from dotenv import load_dotenv
load_dotenv() 

from course_processor import EnhancedCourseProcessor
from query_engine import EnhancedQueryEngine

app = FastAPI(title="Enhanced AI Teaching Assistant", version="2.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
processor = EnhancedCourseProcessor()
query_engines = {}  # Cache query engines per course

# /courses response cache — invalidated immediately on any upload or delete;
# TTL is a safety net for edge cases (e.g. direct Qdrant mutations).
_courses_cache: dict = {"data": None, "expires_at": 0.0}
_COURSES_CACHE_TTL = 60  # seconds

def _invalidate_courses_cache() -> None:
    _courses_cache["data"] = None
    _courses_cache["expires_at"] = 0.0

class QueryRequest(BaseModel):
    question: str
    course_id: str = "demo"
    lesson_filter: Optional[int] = None
    document_filter: Optional[str] = None
    category_filter: Optional[str] = None  # "lesson", "general", or None

@app.get("/")
async def root():
    return {
        "message": "Enhanced AI Teaching Assistant API",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "Hierarchical course processing",
            "Multi-format documents (PDF, DOCX, PPTX, TXT)",
            "Contextual chunking",
            "Response re-ranking", 
            "Lesson-specific querying",
            "General materials support",
            "Course structure analysis"
        ],
    }

@app.post("/upload-course-structure")
async def upload_course_structure(
    file: UploadFile = File(...),
    force_recreate: bool = Form(False)
):
    """Upload a ZIP file containing a course folder structure for processing."""
    if not file.filename:
        raise HTTPException(400, "A ZIP filename is required for course structure uploads")
    safe_name = Path(file.filename).name
    if not safe_name or not safe_name.endswith(".zip"):
        raise HTTPException(400, "Only ZIP files are accepted for course structure uploads")

    tmp_dir = tempfile.mkdtemp()
    try:
        zip_path = os.path.join(tmp_dir, safe_name)
        chunk_size = 1024 * 1024
        with open(zip_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)

        extract_dir = os.path.join(tmp_dir, "extracted")
        with zipfile.ZipFile(zip_path, "r") as zf:
            extract_path = Path(extract_dir).resolve()
            for member in zf.infolist():
                member_path = (extract_path / member.filename).resolve()
                if not str(member_path).startswith(str(extract_path) + os.sep):
                    raise HTTPException(400, f"Invalid path in ZIP: {member.filename}")
                zf.extract(member, extract_dir)

        courses = processor.parse_course_structure(extract_dir)
        if not courses:
            raise HTTPException(422, "No valid course structure found in ZIP. Expected: CourseName/Lesson X - Topic/file.pdf")

        processor.process_course_structure(courses, force_recreate=force_recreate)
        _invalidate_courses_cache()  # new collection(s) now exist; next GET /courses must re-fetch

        total_docs = sum(
            sum(len(lesson["documents"]) for lesson in c.lessons) + len(c.general_documents)
            for c in courses
        )
        return {
            "message": "Course structure processed successfully",
            "courses_processed": len(courses),
            "total_documents": total_docs,
            "courses": [
                {
                    "course_id": c.course_id,
                    "course_name": c.course_name,
                    "lessons": len(c.lessons),
                    "general_documents": len(c.general_documents)
                }
                for c in courses
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to process course structure: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/upload-single")
async def upload_single_document(
    file: UploadFile = File(...),
    course_id: str = Form("demo"),
    lesson_order: int = Form(1),
    lesson_name: str = Form("General")
):
    """Upload a single document and index it into the specified course collection."""
    if not file.filename:
        raise HTTPException(400, "A filename is required for document uploads")
    safe_name = Path(file.filename).name
    if not safe_name:
        raise HTTPException(400, "A filename is required for document uploads")
    supported = {".pdf", ".txt", ".md", ".docx", ".pptx"}
    suffix = Path(safe_name).suffix.lower()
    if suffix not in supported:
        raise HTTPException(400, f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(supported))}")

    tmp_dir = tempfile.mkdtemp()
    try:
        tmp_path = os.path.join(tmp_dir, safe_name)
        chunk_size = 1024 * 1024
        with open(tmp_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)

        result = processor.process_single_document(
            file_path=tmp_path,
            course_id=course_id,
            lesson_order=lesson_order,
            lesson_name=lesson_name,
        )

        # Invalidate cached query engine so it picks up the new vectors
        if course_id in query_engines:
            del query_engines[course_id]
        _invalidate_courses_cache()  # document count / lesson structure changed; stale listing must not be served

        return {
            "message": "Document uploaded and indexed successfully",
            "course_id": course_id,
            "collection": result["collection_name"],
            "document_name": file.filename,
            "lesson_order": lesson_order,
            "lesson_name": lesson_name,
            "chunks_created": result["chunks_stored"],
            "lesson_id": result["lesson_id"],
            "category": result["category"],
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to process document: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

@app.get("/upload-info")
async def get_upload_info():
    """Info about file system upload method"""
    return {
        "upload_method": "file_system_monitor",
        "upload_directory": str(Path("./course_uploads").absolute()),
        "instructions": [
            "1. Copy ZIP files to ./course_uploads/ directory",
            "2. Use format: courseid_coursename.zip",
            "3. System auto-detects and processes changes"
        ]
    }

@app.post("/query")
async def query_documents(request: QueryRequest):
    """Enhanced query endpoint with lesson, document, and category filtering"""
    try:
        # Initialize query engine for course if not cached
        if request.course_id not in query_engines:
            query_engines[request.course_id] = EnhancedQueryEngine(request.course_id)
        
        engine = query_engines[request.course_id]
        
        # Use enhanced query with filters
        result = engine.query(
            question=request.question,
            lesson_filter=request.lesson_filter,
            
            document_filter=request.document_filter,
            category_filter=request.category_filter
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Query failed: {str(e)}")

@app.get("/courses")
async def list_courses():
    """Get list of available courses and their structure"""
    # Return cached result if still fresh — avoids a Qdrant round-trip on every page load
    now = time.time()
    if _courses_cache["data"] is not None and now < _courses_cache["expires_at"]:
        return _courses_cache["data"]

    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )

        collections = client.get_collections()
        courses = []

        for collection in collections.collections:
            if not collection.name.startswith("course_"):
                continue

            course_id = collection.name.replace("course_", "")

            try:
                # Scroll payloads directly — skips loading BGE + reranker models entirely
                points, _ = client.scroll(
                    collection_name=collection.name,
                    limit=100,
                    with_payload=True,
                    with_vectors=False,  # don't transfer embedding vectors over the wire
                )

                lessons = {}
                documents = set()
                course_name = None
                general_docs = set()

                for point in points:
                    payload = point.payload or {}
                    if not course_name and payload.get("course_name"):
                        course_name = payload["course_name"]

                    lesson_order = payload.get("lesson_order", 0)
                    lesson_name = payload.get("lesson_name", "Unknown")
                    doc_name = payload.get("document_name", "")
                    category = payload.get("category", "lesson")

                    if lesson_order == 0 or category == "general":
                        if doc_name:
                            general_docs.add(doc_name)
                    else:
                        if lesson_order not in lessons:
                            lessons[lesson_order] = {"lesson_name": lesson_name, "documents": set()}
                        if doc_name:
                            lessons[lesson_order]["documents"].add(doc_name)

                    if doc_name:
                        documents.add(doc_name)

                for lesson_data in lessons.values():
                    lesson_data["documents"] = list(lesson_data["documents"])

                courses.append({
                    "course_id": course_id,
                    "course_name": course_name or f"Course {course_id}",
                    "total_lessons": len(lessons),
                    "total_documents": len(documents),
                    "lessons": dict(sorted(lessons.items())),
                })

            except Exception as e:
                courses.append({
                    "course_id": course_id,
                    "course_name": f"Course {course_id}",
                    "error": f"Could not load course details: {e}",
                })

        result = {"total_courses": len(courses), "courses": courses}
        # Cache for TTL seconds; upload/delete endpoints invalidate eagerly before expiry
        _courses_cache["data"] = result
        _courses_cache["expires_at"] = time.time() + _COURSES_CACHE_TTL
        return result

    except Exception as e:
        raise HTTPException(500, f"Failed to list courses: {str(e)}")

@app.get("/courses/{course_id}/topics")
async def get_course_topics(course_id: str):
    """Get available topics/lessons for a specific course"""
    try:
        if course_id not in query_engines:
            query_engines[course_id] = EnhancedQueryEngine(course_id)
        
        engine = query_engines[course_id]
        topics = engine.get_lesson_topics()
        
        return {
            "course_id": course_id,
            "topics": topics
        }
    
    except Exception as e:
        raise HTTPException(500, f"Failed to get course topics: {str(e)}")

@app.get("/courses/{course_id}/summary")
async def get_course_summary(course_id: str):
    """Get AI-generated summary of course content"""
    try:
        if course_id not in query_engines:
            query_engines[course_id] = EnhancedQueryEngine(course_id)
        
        engine = query_engines[course_id]
        summary = engine.get_course_summary()
        
        return summary
    
    except Exception as e:
        raise HTTPException(500, f"Failed to generate course summary: {str(e)}")

@app.post("/query-general")
async def query_general_materials(
    question: str = Form(...),
    course_id: str = Form("demo")
):
    """Query only general course materials (syllabus, course overview, etc.)"""
    try:
        if course_id not in query_engines:
            query_engines[course_id] = EnhancedQueryEngine(course_id)
        
        engine = query_engines[course_id]
        result = engine.query_general_materials(question)
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"General materials query failed: {str(e)}")

@app.post("/query-lessons")
async def query_lesson_materials(
    question: str = Form(...),
    course_id: str = Form("demo")
):
    """Query only lesson-specific materials"""
    try:
        if course_id not in query_engines:
            query_engines[course_id] = EnhancedQueryEngine(course_id)
        
        engine = query_engines[course_id]
        result = engine.query_lesson_materials(question)
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Lesson materials query failed: {str(e)}")

@app.post("/query-lesson")
async def query_lesson(
    question: str = Form(...),
    course_id: str = Form("demo"),
    lesson_order: int = Form(...)
):
    """Convenience endpoint to query within a specific lesson"""
    try:
        if course_id not in query_engines:
            query_engines[course_id] = EnhancedQueryEngine(course_id)
        
        engine = query_engines[course_id]
        result = engine.query_by_lesson(question, lesson_order)
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Lesson query failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Enhanced health check with service status"""
    services = {
        "groq_api": "configured" if os.getenv("GROQ_API_KEY") else "missing",
        "qdrant": "configured" if os.getenv("QDRANT_URL") else "missing",
        "embeddings": "local (HuggingFace BGE)",
        "reranker": "enabled (sentence-transformers)"
    }
    
    # Test Qdrant connection
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        collections = client.get_collections()
        services["qdrant_status"] = f"connected ({len(collections.collections)} collections)"
    except Exception as e:
        services["qdrant_status"] = f"connection failed: {e}"
    
    return {
        "status": "healthy",
        "version": "2.0.0",
        "features": {
            "contextual_chunking": "enabled",
            "response_reranking": "enabled", 
            "hierarchical_courses": "enabled",
            "lesson_filtering": "enabled",
            "multi_format_documents": "enabled (PDF, DOCX, PPTX, TXT)",
            "general_materials_support": "enabled"
        },
        "services": services
    }

@app.get("/debug/collections")
async def debug_collections():
    """Debug endpoint to show all collections and their stats"""
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        
        collections = client.get_collections()
        collection_stats = []
        
        for collection in collections.collections:
            try:
                count = client.count(collection.name)
                info = client.get_collection(collection.name)
                
                collection_stats.append({
                    "name": collection.name,
                    "vector_count": count.count,
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance.value
                })
            except Exception as e:
                collection_stats.append({
                    "name": collection.name,
                    "error": str(e)
                })
        
        return {
            "total_collections": len(collections.collections),
            "collections": collection_stats
        }
    
    except Exception as e:
        return {"error": str(e)}

@app.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    """Delete a course and its vector collection"""
    try:
        collection_name = f"course_{course_id}"
        
        from qdrant_client import QdrantClient
        client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        
        # Check if collection exists
        collections = client.get_collections()
        existing_collections = [col.name for col in collections.collections]
        
        if collection_name not in existing_collections:
            raise HTTPException(404, f"Course {course_id} not found")
        
        # Delete collection
        client.delete_collection(collection_name)
        _invalidate_courses_cache()  # course gone from Qdrant; must not appear in next listing

        # Remove from cache
        if course_id in query_engines:
            del query_engines[course_id]
        
        return {
            "message": f"Course {course_id} deleted successfully",
            "collection_deleted": collection_name
        }
    
    except Exception as e:
        raise HTTPException(500, f"Failed to delete course: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

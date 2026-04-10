import os
import time
from typing import Dict, List, Optional
from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from llama_index.core.embeddings import resolve_embed_model
from llama_index.core.postprocessor import SentenceTransformerRerank

class EnhancedQueryEngine:
    def __init__(self, course_id: str = "demo"):
        self.course_id = course_id
        collection_name = f"course_{course_id}"
        
        print(f"🔍 Initializing Enhanced QueryEngine for collection: {collection_name}")
        
        # Use local embeddings
        Settings.embed_model = resolve_embed_model("local:BAAI/bge-small-en-v1.5")
        from llama_index.llms.groq import Groq
        Settings.llm = Groq(model="llama3-70b-8192", api_key=os.getenv("GROQ_API_KEY"))
        
        self.qdrant_client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        
        # Check if collection exists and has data
        try:
            collections = self.qdrant_client.get_collections()
            existing_collections = [col.name for col in collections.collections]
            
            if collection_name not in existing_collections:
                raise Exception(f"Collection {collection_name} does not exist. Available: {existing_collections}")
            
            count_result = self.qdrant_client.count(collection_name)
            print(f"📊 Vectors in {collection_name}: {count_result.count}")
            
            if count_result.count == 0:
                raise Exception(f"Collection {collection_name} exists but has no vectors")
            
            self.vector_store = QdrantVectorStore(
                client=self.qdrant_client,
                collection_name=collection_name
            )
            
            self.index = VectorStoreIndex.from_vector_store(self.vector_store)
            
            # Initialize re-ranker for improved relevance
            self.reranker = SentenceTransformerRerank(
                model="cross-encoder/ms-marco-MiniLM-L-2-v2",
                top_n=5
            )
            
            # Create query engine with re-ranking
            self.query_engine = self.index.as_query_engine(
                similarity_top_k=10,  # Retrieve more candidates for re-ranking
                node_postprocessors=[self.reranker],
                response_mode="compact"
            )
            
            print(f"✅ Enhanced QueryEngine initialized successfully")
            
        except Exception as e:
            print(f"❌ QueryEngine initialization failed: {e}")
            raise e

    def query(self, question: str, lesson_filter: Optional[int] = None, 
              document_filter: Optional[str] = None) -> Dict:
        """
        Enhanced query with optional filtering by lesson or document
        
        Args:
            question: The user's question
            lesson_filter: Optional lesson number to filter by (e.g., 1 for "Lesson 1")
            document_filter: Optional document name to filter by
        """
        print(f"❓ Processing query: {question}")
        if lesson_filter:
            print(f"🎯 Filtering by lesson: {lesson_filter}")
        if document_filter:
            print(f"📄 Filtering by document: {document_filter}")
        
        start_time = time.time()
        
        try:
            # Build metadata filters if specified
            filters = self._build_metadata_filters(lesson_filter, document_filter)
            
            # Create filtered query engine if filters are provided
            if filters:
                filtered_query_engine = self.index.as_query_engine(
                    similarity_top_k=10,
                    node_postprocessors=[self.reranker],
                    response_mode="compact",
                    filters=filters
                )
                response = filtered_query_engine.query(question)
            else:
                response = self.query_engine.query(question)
            
            end_time = time.time()
            response_time = round(end_time - start_time, 2)
            
            print(f"⏱️ Query completed in {response_time} seconds")
            
            # Process sources with enhanced metadata
            sources = []
            if hasattr(response, 'source_nodes'):
                print(f"📚 Found {len(response.source_nodes)} source nodes")
                for i, node in enumerate(response.source_nodes):
                    source_info = self._extract_source_info(node)
                    sources.append(source_info)
                    print(f"📄 Source {i+1}: {source_info['display_name']} (score: {source_info['confidence']:.2f})")
            
            # Get course context
            course_context = self._get_course_context()
            
            result = {
                "question": question,
                "answer": str(response),
                "response_time": response_time,
                "sources": sources,
                "course_context": course_context,
                "filters_applied": {
                    "lesson_filter": lesson_filter,
                    "document_filter": document_filter
                },
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            print(f"✅ Query completed successfully")
            return result
            
        except Exception as e:
            print(f"❌ Query failed: {e}")
            import traceback
            traceback.print_exc()
            raise e

    def _build_metadata_filters(self, lesson_filter: Optional[int], 
                               document_filter: Optional[str]) -> Optional[MetadataFilters]:
        """Build metadata filters for targeted querying"""
        filter_conditions = []
        
        if lesson_filter is not None:
            filter_conditions.append(
                MetadataFilter(
                    key="lesson_order",
                    value=lesson_filter,
                    operator=FilterOperator.EQ
                )
            )
        
        if document_filter:
            filter_conditions.append(
                MetadataFilter(
                    key="document_name",
                    value=document_filter,
                    operator=FilterOperator.EQ
                )
            )
        
        if filter_conditions:
            return MetadataFilters(filters=filter_conditions)
        
        return None

    def _extract_source_info(self, node) -> Dict:
        """Extract enhanced source information from node"""
        metadata = node.metadata
        
        # Create display name with hierarchy
        display_name = f"Lesson {metadata.get('lesson_order', '?')}: {metadata.get('lesson_name', 'Unknown')}"
        if metadata.get('document_name'):
            display_name += f" - {metadata.get('document_name')}"
        
        return {
            "course_name": metadata.get("course_name", "Unknown Course"),
            "lesson_id": metadata.get("lesson_id", "unknown"),
            "lesson_name": metadata.get("lesson_name", "Unknown Lesson"),
            "lesson_order": metadata.get("lesson_order", 0),
            "document_name": metadata.get("document_name", "Unknown Document"),
            "chunk_index": metadata.get("chunk_index", 0),
            "total_chunks": metadata.get("total_chunks", 1),
            "confidence": round(node.score, 2),
            "content_preview": node.text[:200] + "..." if len(node.text) > 200 else node.text,
            "display_name": display_name
        }

    def _get_course_context(self) -> Dict:
        """Get overall course context information"""
        try:
            # Get sample of metadata to understand course structure
            scroll_result = self.qdrant_client.scroll(
                collection_name=f"course_{self.course_id}",
                limit=100,
                with_payload=True
            )
            
            if not scroll_result[0]:
                return {"error": "No course data found"}
            
            # Analyze metadata to get course structure
            lessons = {}
            documents = set()
            course_name = None
            
            for point in scroll_result[0]:
                payload = point.payload
                
                if not course_name and payload.get('course_name'):
                    course_name = payload['course_name']
                
                lesson_order = payload.get('lesson_order', 0)
                lesson_name = payload.get('lesson_name', 'Unknown')
                doc_name = payload.get('document_name', '')
                
                if lesson_order not in lessons:
                    lessons[lesson_order] = {
                        "lesson_name": lesson_name,
                        "documents": set()
                    }
                
                if doc_name:
                    lessons[lesson_order]["documents"].add(doc_name)
                    documents.add(doc_name)
            
            # Convert sets to lists for JSON serialization
            for lesson_data in lessons.values():
                lesson_data["documents"] = list(lesson_data["documents"])
            
            return {
                "course_name": course_name or f"Course {self.course_id}",
                "total_lessons": len(lessons),
                "total_documents": len(documents),
                "lessons": dict(sorted(lessons.items())),
                "all_documents": list(documents)
            }
            
        except Exception as e:
            print(f"⚠️ Could not get course context: {e}")
            return {"error": str(e)}

    def get_lesson_topics(self) -> List[Dict]:
        """Get available lesson topics for UI display"""
        try:
            context = self._get_course_context()
            if "error" in context:
                return []
            
            topics = []
            for lesson_order, lesson_data in context["lessons"].items():
                topics.append({
                    "lesson_order": lesson_order,
                    "lesson_name": lesson_data["lesson_name"],
                    "document_count": len(lesson_data["documents"]),
                    "documents": lesson_data["documents"]
                })
            
            return sorted(topics, key=lambda x: x["lesson_order"])
            
        except Exception as e:
            print(f"⚠️ Could not get lesson topics: {e}")
            return []

    def query_by_lesson(self, question: str, lesson_order: int) -> Dict:
        """Convenience method to query within a specific lesson"""
        return self.query(question, lesson_filter=lesson_order)

    def query_by_document(self, question: str, document_name: str) -> Dict:
        """Convenience method to query within a specific document"""
        return self.query(question, document_filter=document_name)

    def get_course_summary(self) -> Dict:
        """Generate a summary of the course content"""
        try:
            context = self._get_course_context()
            
            if "error" in context:
                return {"error": context["error"]}
            
            # Generate summary using LLM
            summary_prompt = f"""
            Based on the course structure below, provide a brief summary of what this course covers:
            
            Course: {context['course_name']}
            Total Lessons: {context['total_lessons']}
            
            Lessons:
            """
            
            for lesson_order, lesson_data in context["lessons"].items():
                summary_prompt += f"Lesson {lesson_order}: {lesson_data['lesson_name']}\n"
            
            summary_prompt += "\nProvide a 2-3 sentence summary of this course:"
            
            response = self.query_engine.query(summary_prompt)
            
            return {
                "course_name": context['course_name'],
                "summary": str(response),
                "structure": context
            }
            
        except Exception as e:
            return {"error": f"Could not generate course summary: {e}"}

# Usage example for testing
if __name__ == "__main__":
    # Test the enhanced query engine
    engine = EnhancedQueryEngine("cs101")
    
    # Basic query
    result = engine.query("What are variables in programming?")
    print("Basic Query Result:", result)
    
    # Lesson-filtered query
    result = engine.query("Explain variables", lesson_filter=1)
    print("Lesson-Filtered Result:", result)
    
    # Get course structure
    topics = engine.get_lesson_topics()
    print("Available Topics:", topics)
    
    # Course summary
    summary = engine.get_course_summary()
    print("Course Summary:", summary)
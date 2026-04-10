'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Layout from '@/components/Layout';
import { Upload, X, FileText, Trash2, Archive, FolderOpen, Settings } from 'lucide-react';
import { cn } from "@/lib/utils";

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadTime: string;
  type: 'single' | 'course-structure';
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'structure'>('single');
  const [courseId, setCourseId] = useState('demo');
  const [lessonOrder, setLessonOrder] = useState(1);
  const [lessonName, setLessonName] = useState('General');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (uploadMode === 'structure') {
      if (!file.name.endsWith('.zip')) {
        setUploadStatus('Error: Please select a ZIP file for course structure upload.');
        return;
      }
    } else {
      const validTypes = ['application/pdf', 'text/plain', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                          'application/msword', 'application/vnd.ms-powerpoint'];
      const validExtensions = ['.pdf', '.txt', '.md', '.docx', '.pptx', '.doc', '.ppt'];
      
      if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setUploadStatus('Error: Please select a PDF, TXT, DOCX, PPTX, or MD file.');
        return;
      }
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit for ZIP files
      setUploadStatus('Error: File size must be less than 50MB.');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      let endpoint = '';
      if (uploadMode === 'structure') {
        endpoint = 'http://localhost:8000/upload-course-structure';
        formData.append('force_recreate', 'true');
      } else {
        endpoint = 'http://localhost:8000/upload-single';
        formData.append('course_id', courseId);
        formData.append('lesson_order', lessonOrder.toString());
        formData.append('lesson_name', lessonName);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        if (uploadMode === 'structure') {
          setUploadStatus(`✅ Course structure uploaded! Processed ${result.courses_processed?.length || 1} courses with ${result.total_lessons || 0} lessons and ${result.total_documents || 0} documents.`);
        } else {
          setUploadStatus(`✅ Document uploaded to ${result.course_id}, ${result.lesson}!`);
        }
        
        // Add to uploaded documents list
        const newDoc: UploadedDocument = {
          id: Date.now().toString(),
          name: selectedFile.name,
          size: selectedFile.size,
          uploadTime: new Date().toLocaleString(),
          type: uploadMode
        };
        setUploadedDocs(prev => [newDoc, ...prev]);
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setUploadStatus(`❌ Upload failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('❌ Upload failed: Could not connect to server. Please ensure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (id: string) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout title="Course Management (Admin)" showRightPanel={false}>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Admin Notice */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary">Professor/Admin Panel</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This interface is for course administrators to manage course materials. Students will access this content through the chat interface.
            </p>
          </div>

          {/* Upload Mode Toggle */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Upload Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={uploadMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('single')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Single Document
              </Button>
              <Button
                variant={uploadMode === 'structure' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('structure')}
              >
                <Archive className="mr-2 h-4 w-4" />
                Course Structure (ZIP)
              </Button>
            </div>
          </div>

          {/* Upload Area */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                Upload {uploadMode === 'structure' ? 'Course Structure' : 'Course Materials'}
              </h2>
            </div>
            
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {uploadMode === 'structure' ? (
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              )}
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drop your {uploadMode === 'structure' ? 'ZIP file' : 'document'} here or{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </Button>
                </p>
                <p className="text-sm text-muted-foreground">
                  {uploadMode === 'structure' 
                    ? 'ZIP files with course folders (up to 50MB)'
                    : 'PDF, DOCX, PPTX, TXT, MD files (up to 50MB)'
                  }
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={uploadMode === 'structure' ? '.zip' : '.pdf,.txt,.md,.docx,.pptx,.doc,.ppt'}
                className="hidden"
              />
            </div>

            {selectedFile && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {uploadMode === 'structure' ? (
                      <Archive className="h-8 w-8 text-primary" />
                    ) : (
                      <FileText className="h-8 w-8 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)} • {uploadMode === 'structure' ? 'Course Structure' : `${courseId} → Lesson ${lessonOrder}: ${lessonName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpload} 
                      disabled={isUploading}
                      className="px-6"
                    >
                      {isUploading ? 'Processing...' : 'Upload'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {uploadStatus && (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                uploadStatus.includes('✅') 
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              )}>
                {uploadStatus}
              </div>
            )}
          </div>

          {/* Uploaded Documents */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Recent Uploads</h2>
              <span className="text-sm text-muted-foreground">
                ({uploadedDocs.length})
              </span>
            </div>

            {uploadedDocs.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No documents uploaded yet. Upload your first course material above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {doc.type === 'structure' ? (
                        <Archive className="h-8 w-8 text-primary" />
                      ) : (
                        <FileText className="h-8 w-8 text-primary" />
                      )}
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.size)} • {doc.type === 'structure' ? 'Course Structure' : 'Single Document'} • {doc.uploadTime}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocument(doc.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">📋 How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <div className="font-medium text-foreground mb-1">1. Upload</div>
                <div>Add PDF or text files containing course materials</div>
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">2. Process</div>
                <div>AI creates embeddings for semantic search</div>
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">3. Query</div>
                <div>Students can ask questions about the content</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
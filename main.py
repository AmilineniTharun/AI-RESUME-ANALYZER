import io
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from utils import (
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_image,
    analyze_resume,
    chat_with_gemini
)

app = FastAPI(title="AI Resume Analyzer API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageFileWrapper:
    def __init__(self, data: bytes, content_type: str):
        self.data = data
        self.type = content_type
    
    def read(self):
        return self.data

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

class ChatRequest(BaseModel):
    chat_history: List[Dict[str, str]]
    user_message: str
    resume_text: str
    job_description: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "AI Resume Analyzer API is running!"}

@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content = await file.read()
    
    try:
        if filename.endswith(".pdf"):
            pdf_file = io.BytesIO(content)
            text = extract_text_from_pdf(pdf_file)
        elif filename.endswith(".docx"):
            docx_file = io.BytesIO(content)
            text = extract_text_from_docx(docx_file)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            wrapper = ImageFileWrapper(content, file.content_type)
            text = extract_text_from_image(wrapper)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a PDF, DOCX, or Image file (PNG/JPG)."
            )
        
        return {"text": text, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.resume_text.strip() or not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Both resume text and job description are required.")
    
    result = analyze_resume(req.resume_text, req.job_description)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        response_text = chat_with_gemini(
            chat_history=req.chat_history,
            user_message=req.user_message,
            resume_text=req.resume_text,
            job_description=req.job_description
        )
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

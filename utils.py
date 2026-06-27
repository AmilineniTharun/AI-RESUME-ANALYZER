import PyPDF2
import docx
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API key from environment
default_key = os.environ.get("GEMINI_API_KEY")
if not default_key or default_key == "YOUR_GEMINI_API_KEY_HERE":
    default_key = None

if default_key:
    genai.configure(api_key=default_key)

def extract_text_from_pdf(pdf_file):
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in range(len(reader.pages)):
        text += reader.pages[page].extract_text()
    return text

def extract_text_from_docx(docx_file):
    doc = docx.Document(docx_file)
    text = []
    for para in doc.paragraphs:
        text.append(para.text)
    return '\n'.join(text)

def extract_text_from_image(image_file, api_key=None, model_name='gemini-2.5-flash'):
    load_dotenv(override=True)
    current_key = os.environ.get("GEMINI_API_KEY")
    if not current_key or current_key == "YOUR_GEMINI_API_KEY_HERE":
        current_key = None
    
    if api_key and api_key.strip():
        genai.configure(api_key=api_key.strip())
    elif current_key:
        genai.configure(api_key=current_key)
    else:
        raise Exception("API Key is missing or invalid.")
        
    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={"temperature": 0.0}
    )
    image_data = image_file.read()
    
    response = model.generate_content([
        {"mime_type": image_file.type, "data": image_data},
        "Extract and transcribe all the text from this image exactly. Keep the layout and formatting as close to the original as possible. Do not add any introduction, explanations, or commentary. Output only the extracted text."
    ])
    return response.text


def analyze_resume(resume_text, job_description, api_key=None, model_name='gemini-2.5-flash'):
    # Reload environment variables in case .env was updated
    load_dotenv(override=True)
    current_key = os.environ.get("GEMINI_API_KEY")
    if not current_key or current_key == "YOUR_GEMINI_API_KEY_HERE":
        current_key = None
    
    if api_key and api_key.strip():
        genai.configure(api_key=api_key.strip())
    elif current_key:
        genai.configure(api_key=current_key)
    else:
        return {"error": "API Key is missing or invalid. Please configure the GEMINI_API_KEY in the .env file or enter it in the sidebar."}

    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={"temperature": 0.0}
    )
    
    prompt = f"""
    You are an expert Applicant Tracking System (ATS) and Technical HR Manager. 
    Evaluate the given resume against the provided job description.
    
    Resume:
    {resume_text}
    
    Job Description:
    {job_description}
    
    Please provide the following in a valid JSON format EXACTLY as specified below.
    Do not add any markdown formatting (like ```json), just return the raw JSON object.
    
    {{
      "ats_score": "Match percentage (e.g., 85)",
      "missing_keywords": ["keyword1", "keyword2", "keyword3"],
      "profile_summary": "A brief summary of how well the profile matches and what could be improved.",
      "extracted_skills": ["skill1", "skill2"],
      "resume_suggestions": [
        {{
          "category": "Formatting / Content / Keywords / Achievements",
          "text": "Detailed, specific, actionable suggestion for improving the resume",
          "impact": "High / Medium / Low"
        }}
      ],
      "job_recommendations": [
        {{
          "title": "Specific job title matching the resume skills",
          "reason": "Why this role matches the user's resume",
          "skills_needed": ["skill1", "skill2"]
        }}
      ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Sometimes the model returns markdown JSON blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.strip().endswith("```"):
            # strip trailing backticks safely
            response_text = response_text.strip()
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
        return json.loads(response_text)
    except Exception as e:
        return {"error": str(e)}

def chat_with_gemini(chat_history, user_message, resume_text, job_description=None, api_key=None, model_name='gemini-2.5-flash'):
    # Reload environment variables in case .env was updated
    load_dotenv(override=True)
    current_key = os.environ.get("GEMINI_API_KEY")
    if not current_key or current_key == "YOUR_GEMINI_API_KEY_HERE":
        current_key = None
    
    if api_key and api_key.strip():
        genai.configure(api_key=api_key.strip())
    elif current_key:
        genai.configure(api_key=current_key)
    else:
        return "API Key is missing or invalid. Please configure the GEMINI_API_KEY."

    system_instruction = f"""
You are an expert, helpful AI Resume Coach. 
Your task is to help the user improve their resume, rewrite bullets to make them more impactful, highlight key skills, and answer questions.

Here is the user's resume:
{resume_text}

Here is the target job description (if provided):
{job_description or "Not provided"}

Context:
Provide constructive feedback. Suggest specific edits (before/after formatting) where possible. Keep your explanations concise, professional, and actionable.
"""

    try:
        # Configure model with system instructions
        model = genai.GenerativeModel(model_name, system_instruction=system_instruction)
        
        # Convert history format for Gemini API
        contents = []
        for msg in chat_history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [msg["content"]]
            })
            
        chat = model.start_chat(history=contents)
        response = chat.send_message(user_message)
        return response.text
    except Exception as e:
        # Fallback if system instruction or start_chat fails
        try:
            full_prompt = f"{system_instruction}\n\nChat History:\n"
            for msg in chat_history:
                role = "User" if msg["role"] == "user" else "Assistant"
                full_prompt += f"{role}: {msg['content']}\n"
            full_prompt += f"User: {user_message}\nAssistant:"
            
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as inner_e:
            return f"Error communicating with Gemini: {str(inner_e)}"


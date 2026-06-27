import streamlit as st
import pandas as pd
import urllib.parse
from utils import extract_text_from_pdf, extract_text_from_docx, extract_text_from_image, analyze_resume, chat_with_gemini

# Must be the first Streamlit command
st.set_page_config(
    page_title="AI Resume Analyzer",
    page_icon="📄",
    layout="wide"
)

# Custom CSS for a professional look
st.markdown("""
<style>
    .main {
        background-color: #f8f9fa;
    }
    .stButton>button {
        background-color: #004085;
        color: white;
        border-radius: 5px;
        padding: 0.5rem 1rem;
        font-weight: 600;
        border: none;
    }
    .stButton>button:hover {
        background-color: #002752;
        color: white;
    }
    h1 {
        color: #004085;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    h2, h3 {
        color: #343a40;
    }
    .stProgress > div > div > div > div {
        background-color: #28a745;
    }
    .metric-card {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-align: center;
        border-left: 5px solid #004085;
    }
    .metric-value {
        font-size: 3rem;
        font-weight: bold;
        color: #004085;
    }
    .metric-label {
        font-size: 1.2rem;
        color: #6c757d;
    }
    .suggestion-card {
        background-color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        margin-bottom: 10px;
        border-left: 4px solid #ffc107;
    }
    .suggestion-high {
        border-left-color: #dc3545;
    }
    .suggestion-medium {
        border-left-color: #ffc107;
    }
    .suggestion-low {
        border-left-color: #17a2b8;
    }
    .job-card {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        margin-bottom: 15px;
        border-top: 4px solid #28a745;
    }
    .badge {
        padding: 0.25em 0.6em;
        font-size: 75%;
        font-weight: 700;
        border-radius: 0.25rem;
        color: white;
    }
    .badge-high { background-color: #dc3545; }
    .badge-medium { background-color: #ffc107; color: black; }
    .badge-low { background-color: #17a2b8; }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "analysis_results" not in st.session_state:
    st.session_state.analysis_results = None
if "resume_text" not in st.session_state:
    st.session_state.resume_text = ""
if "job_description" not in st.session_state:
    st.session_state.job_description = ""
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

st.title("📄 AI Resume Analyzer")
st.markdown("Optimize your resume for the Applicant Tracking System (ATS) and align it with your target job role.")

col1, col2 = st.columns([1, 1])

with col1:
    st.header("1. Resume Content")
    resume_input_method = st.radio("Choose Resume Input Method:", ["Upload File (PDF/DOCX/Image)", "Paste Resume Text"], horizontal=True, key="resume_input_method")
    
    resume_text = ""
    if resume_input_method == "Upload File (PDF/DOCX/Image)":
        uploaded_file = st.file_uploader("Upload your resume (PDF, DOCX, PNG, JPG, or JPEG)", type=["pdf", "docx", "png", "jpg", "jpeg"], key="resume_file")
        if uploaded_file is not None:
            if uploaded_file.name.lower().endswith('.pdf'):
                extracted_text = extract_text_from_pdf(uploaded_file)
            elif uploaded_file.name.lower().endswith('.docx'):
                extracted_text = extract_text_from_docx(uploaded_file)
            elif uploaded_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                with st.expander("🖼️ Click to View Uploaded Image", expanded=False):
                    st.image(uploaded_file, caption="Uploaded Resume Preview", use_container_width=True)
                extracted_text = extract_text_from_image(uploaded_file)
            else:
                extracted_text = ""
            
            with st.expander("📄 View / Edit Extracted Resume Text (Verify Accuracy)", expanded=True):
                resume_text = st.text_area("Extracted text is editable below:", value=extracted_text, height=200, key=f"resume_extracted_edit_{uploaded_file.name}")
    else:
        resume_text = st.text_area("Paste your resume content here", height=200, placeholder="Copy and paste the plain text of your resume...", key="resume_paste")

with col2:
    st.header("2. Job Description")
    jd_input_method = st.radio("Choose Job Description Input Method:", ["Upload File (PDF/DOCX/Image)", "Paste Job Description Text"], horizontal=True, key="jd_input_method")
    
    job_description = ""
    if jd_input_method == "Upload File (PDF/DOCX/Image)":
        uploaded_jd_file = st.file_uploader("Upload target job description (PDF, DOCX, PNG, JPG, or JPEG)", type=["pdf", "docx", "png", "jpg", "jpeg"], key="jd_file")
        if uploaded_jd_file is not None:
            if uploaded_jd_file.name.lower().endswith('.pdf'):
                extracted_jd_text = extract_text_from_pdf(uploaded_jd_file)
            elif uploaded_jd_file.name.lower().endswith('.docx'):
                extracted_jd_text = extract_text_from_docx(uploaded_jd_file)
            elif uploaded_jd_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                with st.expander("🖼️ Click to View Uploaded Image", expanded=False):
                    st.image(uploaded_jd_file, caption="Uploaded Job Description Preview", use_container_width=True)
                extracted_jd_text = extract_text_from_image(uploaded_jd_file)
            else:
                extracted_jd_text = ""
            
            with st.expander("📄 View / Edit Extracted Job Description Text (Verify Accuracy)", expanded=True):
                job_description = st.text_area("Extracted text is editable below:", value=extracted_jd_text, height=200, key=f"jd_extracted_edit_{uploaded_jd_file.name}")
    else:
        job_description = st.text_area("Paste the job description here", height=200, placeholder="Paste the target job description here to analyze matching keywords and score...", key="jd_paste")

if st.button("Analyze Resume", use_container_width=True):
    if resume_text and job_description:
        with st.spinner("Extracting text and analyzing with AI..."):
            # Analyze
            results = analyze_resume(resume_text, job_description)
            
            if "error" in results:
                st.error(f"Error during analysis: {results['error']}")
            else:
                st.session_state.analysis_results = results
                st.session_state.resume_text = resume_text
                st.session_state.job_description = job_description
                # Reset chat history when new analysis is triggered
                st.session_state.chat_history = [
                    {"role": "assistant", "content": "Hello! I am your AI Resume Coach. I've analyzed your resume against the target job. How can I help you improve it?"}
                ]
                st.success("Analysis Complete!")
    else:
        st.warning("Please provide both your resume (via upload or paste) and the job description.")

# Render Results Dashboard
if st.session_state.analysis_results is not None:
    st.markdown("---")
    st.header("Analysis Results Dashboard")
    
    results = st.session_state.analysis_results
    
    # Define Tabs
    tab_analysis, tab_suggestions, tab_jobs = st.tabs([
        "📊 ATS Score & Match", 
        "💡 Improvement Suggestions", 
        "💼 Online Job Matches"
    ])
    
    with tab_analysis:
        res_col1, res_col2 = st.columns([1, 2])
        
        with res_col1:
            score = results.get("ats_score", "0")
            try:
                # Handle potential non-numeric or percentage representations
                if isinstance(score, str):
                    score_val = int(score.replace("%", "").strip())
                else:
                    score_val = int(score)
            except Exception:
                score_val = 0
            
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">ATS Match Score</div>
                <div class="metric-value">{score_val}%</div>
            </div>
            """, unsafe_allow_html=True)
            
            st.progress(score_val / 100.0)
            
        with res_col2:
            st.subheader("Profile Summary")
            st.write(results.get("profile_summary", "No summary provided."))
        
        st.markdown("---")
        
        # Keywords and Skills
        kw_col1, kw_col2 = st.columns([1, 1])
        
        with kw_col1:
            st.subheader("Missing Keywords")
            missing = results.get("missing_keywords", [])
            if missing:
                for kw in missing:
                    st.markdown(f"- ❌ {kw}")
            else:
                st.write("Great! No major keywords missing.")
        
        with kw_col2:
            st.subheader("Extracted Skills")
            skills = results.get("extracted_skills", [])
            if skills:
                st.write(", ".join([f"**{skill}**" for skill in skills]))
            else:
                st.write("No specific skills extracted.")
                
    with tab_suggestions:
        st.subheader("Actionable Suggestions to Improve Your Resume")
        suggestions = results.get("resume_suggestions", [])
        
        if suggestions:
            for sug in suggestions:
                impact = sug.get("impact", "Medium").strip().capitalize()
                category = sug.get("category", "General")
                text = sug.get("text", "")
                
                # Determine color badge style class
                badge_class = "badge-medium"
                card_class = "suggestion-medium"
                if "high" in impact.lower():
                    badge_class = "badge-high"
                    card_class = "suggestion-high"
                elif "low" in impact.lower():
                    badge_class = "badge-low"
                    card_class = "suggestion-low"
                
                st.markdown(f"""
                <div class="suggestion-card {card_class}">
                    <span class="badge {badge_class}">{impact} Impact</span>
                    <strong>[{category}]</strong>
                    <p style="margin-top: 5px; margin-bottom: 0px;">{text}</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No explicit suggestions generated. Your resume looks solid!")
            
    with tab_jobs:
        st.subheader("Online Job Recommendations")
        st.markdown("Based on your resume profile and extracted skills, here are some matching roles. Click the job board links to view current openings.")
        
        recommendations = results.get("job_recommendations", [])
        if recommendations:
            for job in recommendations:
                title = job.get("title", "Job Role")
                reason = job.get("reason", "")
                skills_needed = job.get("skills_needed", [])
                
                # Url encode the job title for links
                encoded_title = urllib.parse.quote(title)
                
                # Job search links
                linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_title}"
                indeed_url = f"https://www.indeed.com/jobs?q={encoded_title}"
                google_jobs_url = f"https://www.google.com/search?q={encoded_title}+jobs"
                
                st.markdown(f"""
                <div class="job-card">
                    <h4>🔍 {title}</h4>
                    <p><strong>Match Rationale:</strong> {reason}</p>
                    <p><strong>Recommended Skills to Highlight:</strong> {', '.join([f'`{s}`' for s in skills_needed])}</p>
                    <div style="margin-top: 10px;">
                        <a href="{linkedin_url}" target="_blank" style="margin-right: 15px; text-decoration: none; color: #0077b5; font-weight: bold;">🔗 LinkedIn Jobs</a>
                        <a href="{indeed_url}" target="_blank" style="margin-right: 15px; text-decoration: none; color: #2164f3; font-weight: bold;">🔗 Indeed</a>
                        <a href="{google_jobs_url}" target="_blank" style="text-decoration: none; color: #4285f4; font-weight: bold;">🔗 Google Jobs</a>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        else:
            # Fallback if no job recommendations were parsed
            st.info("No specific job recommendations parsed. Let's try searching jobs based on your extracted skills.")
            skills = results.get("extracted_skills", [])
            if skills:
                search_title = skills[0]
                encoded_title = urllib.parse.quote(search_title)
                linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_title}"
                st.markdown(f"[Search jobs for {search_title} on LinkedIn]({linkedin_url})")
                
# Sidebar AI Resume Coach Chatbot
with st.sidebar:
    st.markdown("## 🤖 AI Resume Coach")
    st.markdown("Ask questions, get feedback, or upload a revised resume to compare and recheck your score.")
    
    if st.session_state.analysis_results is not None:
        st.markdown("---")
        st.markdown("#### 🔄 Recheck Revised Resume")
        uploaded_revised_file = st.file_uploader(
            "Upload revised resume (PDF, DOCX, PNG, JPG, or JPEG) to compare & check",
            type=["pdf", "docx", "png", "jpg", "jpeg"],
            key="revised_resume_file"
        )
        
        if uploaded_revised_file is not None:
            if st.button("Compare & Recheck", key="recheck_button", use_container_width=True):
                with st.spinner("Analyzing changes..."):
                    # Extract text
                    if uploaded_revised_file.name.lower().endswith('.pdf'):
                        rev_text = extract_text_from_pdf(uploaded_revised_file)
                    elif uploaded_revised_file.name.lower().endswith('.docx'):
                        rev_text = extract_text_from_docx(uploaded_revised_file)
                    elif uploaded_revised_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        rev_text = extract_text_from_image(uploaded_revised_file)
                    else:
                        rev_text = ""
                    
                    if rev_text:
                        comparison_prompt = f"""
                        Compare my newly uploaded revised resume with my original resume and the target job description.
                        
                        Original Resume:
                        {st.session_state.resume_text}
                        
                        Revised Resume:
                        {rev_text}
                        
                        Job Description:
                        {st.session_state.job_description}
                        
                        Please provide an honest and helpful evaluation:
                        1. Has the ATS match score improved? Give an estimated new score and compare with the previous score.
                        2. Which of the suggestions from the analysis have been successfully addressed?
                        3. What remaining gaps or new recommendations do you have?
                        """
                        
                        # Call Gemini
                        comparison_feedback = chat_with_gemini(
                            chat_history=st.session_state.chat_history,
                            user_message=comparison_prompt,
                            resume_text=st.session_state.resume_text,
                            job_description=st.session_state.job_description
                        )
                        
                        # Append to chat history
                        st.session_state.chat_history.append({"role": "user", "content": f"Uploaded revised resume: {uploaded_revised_file.name} for recheck."})
                        st.session_state.chat_history.append({"role": "assistant", "content": comparison_feedback})
                        st.success("Recheck complete! Review the feedback below in the chat.")
                    else:
                        st.error("Could not extract text from the uploaded file.")
        
        # Chat interface
        st.markdown("---")
        st.markdown("#### 💬 Coach Chat")
        
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])
                
        if user_prompt := st.chat_input("Ask the Resume Coach...", key="sidebar_chat_input"):
            with st.chat_message("user"):
                st.write(user_prompt)
            st.session_state.chat_history.append({"role": "user", "content": user_prompt})
            
            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    coach_response = chat_with_gemini(
                        chat_history=st.session_state.chat_history[:-1], 
                        user_message=user_prompt, 
                        resume_text=st.session_state.resume_text,
                        job_description=st.session_state.job_description
                    )
                    st.write(coach_response)
            st.session_state.chat_history.append({"role": "assistant", "content": coach_response})
            st.rerun()
    else:
        st.info("Run the initial resume analysis first to activate the AI Resume Coach Chatbot and recheck features.")

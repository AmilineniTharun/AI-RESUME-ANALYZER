import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  ArrowRight, 
  Bot, 
  Send, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle, 
  Briefcase, 
  ExternalLink,
  MessageSquare,
  FileCheck,
  RefreshCw,
  Eye
} from "lucide-react";
import "./App.css";

function App() {
  // Resume state
  const [resumeInputMethod, setResumeInputMethod] = useState("upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileStatus, setResumeFileStatus] = useState("idle");
  const [resumeText, setResumeText] = useState("");
  const [resumeDragOver, setResumeDragOver] = useState(false);

  // Job Description state
  const [jdInputMethod, setJdInputMethod] = useState("paste");
  const [jdFile, setJdFile] = useState(null);
  const [jdFileStatus, setJdFileStatus] = useState("idle");
  const [jobDescription, setJobDescription] = useState("");
  const [jdDragOver, setJdDragOver] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeTab, setActiveTab] = useState("score");
  const [errorMessage, setErrorMessage] = useState("");

  // Preview Modal state
  const [previewText, setPreviewText] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [revisedFileStatus, setRevisedFileStatus] = useState("idle");

  const chatHistoryEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatHistoryEndRef.current) {
      chatHistoryEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isSendingChat]);

  // File drag-and-drop handlers
  const handleDragOver = (e, setDragOver) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e, setDragOver) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e, setDragOver, setFile, setStatus, setText) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelection(file, setFile, setStatus, setText);
    }
  };

  const handleFileChange = async (e, setFile, setStatus, setText) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileSelection(file, setFile, setStatus, setText);
    }
  };

  const handleFileSelection = async (file, setFile, setStatus, setText) => {
    const validExtensions = ["pdf", "docx", "png", "jpg", "jpeg"];
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      alert("Unsupported file format. Please upload a PDF, DOCX, or Image file.");
      return;
    }

    setFile(file);
    setStatus("extracting");
    
    try {
      const text = await extractText(file);
      setText(text);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      alert(`Text extraction failed: ${err.message}`);
    }
  };

  const removeFile = (setFile, setStatus, setText) => {
    setFile(null);
    setStatus("idle");
    setText("");
  };

  // API Calls
  const extractText = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("http://localhost:8000/api/extract", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Extraction failed");
    }
    
    const data = await response.json();
    return data.text;
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      alert("Please provide resume text or upload a file first.");
      return;
    }
    if (!jobDescription.trim()) {
      alert("Please provide the job description.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setLoadingStep(1); // Extracting & Parsing

    try {
      // Simulate stepped progression for visual elegance
      setTimeout(() => setLoadingStep(2), 1200); // ATS Evaluation
      setTimeout(() => setLoadingStep(3), 2400); // Rationale & Suggestions
      
      const results = await analyzeResume(resumeText, jobDescription);
      
      setTimeout(() => {
        setAnalysisResults(results);
        setIsAnalyzing(false);
        setLoadingStep(0);
        setActiveTab("score");
        // Initialize chatbot with custom message
        setChatHistory([
          {
            role: "assistant",
            content: "Hello! I am your AI Resume Coach. I've analyzed your resume details against the target job description. How can I help you improve it? I can help rewrite bullet points, suggest keywords, or look into specific skills!"
          }
        ]);
      }, 3500);

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during analysis.");
      setIsAnalyzing(false);
      setLoadingStep(0);
    }
  };

  const analyzeResume = async (resText, jdText) => {
    const response = await fetch("http://localhost:8000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: resText, job_description: jdText }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Analysis failed");
    }
    
    return await response.json();
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    
    const updatedHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(updatedHistory);
    setIsSendingChat(true);

    try {
      const reply = await sendChatMessage(updatedHistory, userMsg, resumeText, jobDescription);
      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [
        ...prev, 
        { role: "assistant", content: `Sorry, I encountered an error answering that: ${err.message}` }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const sendChatMessage = async (history, userMessage, resText, jdText) => {
    const response = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_history: history.slice(0, -1), // Send previous history
        user_message: userMessage,
        resume_text: resText,
        job_description: jdText
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to communicate with AI Coach");
    }

    const data = await response.json();
    return data.response;
  };

  const handleRevisedResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRevisedFileStatus("extracting");
    try {
      const extractedText = await extractText(file);
      setRevisedFileStatus("success");

      const userMsg = `Uploaded revised resume: ${file.name} for recheck.`;
      const updatedHistory = [...chatHistory, { role: "user", content: userMsg }];
      setChatHistory(updatedHistory);
      setIsSendingChat(true);

      const comparisonPrompt = `
Compare my newly uploaded revised resume with my original resume and the target job description.

Original Resume:
${resumeText}

Revised Resume:
${extractedText}

Job Description:
${jobDescription}

Please provide an honest and helpful evaluation:
1. Has the ATS match score improved? Give an estimated new score and compare with the previous score.
2. Which of the suggestions from the analysis have been successfully addressed?
3. What remaining gaps or new recommendations do you have?
`;

      const reply = await sendChatMessage(updatedHistory, comparisonPrompt, resumeText, jobDescription);
      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setRevisedFileStatus("error");
      setChatHistory(prev => [
        ...prev, 
        { role: "assistant", content: `Error analyzing revised resume: ${err.message}` }
      ]);
    } finally {
      setIsSendingChat(false);
      setTimeout(() => setRevisedFileStatus("idle"), 3000);
    }
  };

  // Helper for rendering line breaks in chat
  const formatChatMessage = (text) => {
    return text.split("\n").map((line, index) => {
      // Bold syntax helper: **text**
      let parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={index} style={{ display: "block", marginBottom: line.trim() === "" ? "8px" : "4px" }}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  // Score circular properties
  const scoreVal = analysisResults ? parseInt(String(analysisResults.ats_score).replace("%", "").trim()) || 0 : 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreVal / 100) * circumference;

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return "var(--success)";
    if (score >= 50) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div className="app-container">
      {/* Navbar Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Sparkles size={22} color="white" />
          </div>
          <div className="logo-text">
            <h1>RESUMATE</h1>
            <p>AI Resume Optimizer & Coach</p>
          </div>
        </div>
        <div className="status-badge">
          <div className="status-indicator"></div>
          <span>Gemini 2.5 Flash Online</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="app-workspace">
        {/* Column 1: Input controls */}
        <section className="workspace-panel input-panel">
          <div className="panel-header">
            <FileText size={18} />
            <h2>1. Profile Inputs</h2>
          </div>
          
          <div className="panel-body glass-panel" style={{ padding: "20px" }}>
            <div className="step-container">
              
              {/* Resume Section */}
              <div className="input-section">
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="section-label">Your Resume</span>
                  <span className="upload-hint">PDF, DOCX, Image</span>
                </div>
                
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${resumeInputMethod === "upload" ? "active" : ""}`}
                    onClick={() => setResumeInputMethod("upload")}
                  >
                    Upload File
                  </button>
                  <button 
                    className={`toggle-btn ${resumeInputMethod === "paste" ? "active" : ""}`}
                    onClick={() => setResumeInputMethod("paste")}
                  >
                    Paste Text
                  </button>
                </div>

                {resumeInputMethod === "upload" ? (
                  <div>
                    {!resumeFile ? (
                      <div 
                        className={`upload-zone ${resumeDragOver ? "dragover" : ""}`}
                        onDragOver={(e) => handleDragOver(e, setResumeDragOver)}
                        onDragLeave={(e) => handleDragLeave(e, setResumeDragOver)}
                        onDrop={(e) => handleDrop(e, setResumeDragOver, setResumeFile, setResumeFileStatus, setResumeText)}
                      >
                        <input 
                          type="file" 
                          id="resume-upload" 
                          style={{ display: "none" }}
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileChange(e, setResumeFile, setResumeFileStatus, setResumeText)}
                        />
                        <label htmlFor="resume-upload" style={{ cursor: "pointer", width: "100%" }}>
                          <Upload className="upload-icon" size={24} />
                          <p className="upload-text">Drag file here or click to browse</p>
                          <span className="upload-hint">Supports PDF, DOCX, PNG, JPG</span>
                        </label>
                      </div>
                    ) : (
                      <div className="file-chip">
                        <div className="file-info">
                          <FileText className="file-icon" size={16} />
                          <div className="file-details">
                            <span className="file-name">{resumeFile.name}</span>
                            <span className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`file-status status-${resumeFileStatus}`}>
                            {resumeFileStatus === "extracting" && "Parsing..."}
                            {resumeFileStatus === "success" && "Ready"}
                            {resumeFileStatus === "error" && "Error"}
                          </span>
                          <button 
                            className="btn-view-file" 
                            type="button"
                            title="View uploaded resume"
                            onClick={() => {
                              setPreviewTitle(resumeFile?.name || "Resume");
                              setPreviewText(resumeText);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button className="btn-remove-file" onClick={() => removeFile(setResumeFile, setResumeFileStatus, setResumeText)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea 
                    className="custom-textarea"
                    style={{ height: "140px" }}
                    placeholder="Paste the plain text of your resume here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                )}
              </div>

              {/* Job Description Section */}
              <div className="input-section">
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="section-label">Target Job Role</span>
                  <span className="upload-hint">JD Details</span>
                </div>
                
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${jdInputMethod === "upload" ? "active" : ""}`}
                    onClick={() => setJdInputMethod("upload")}
                  >
                    Upload File
                  </button>
                  <button 
                    className={`toggle-btn ${jdInputMethod === "paste" ? "active" : ""}`}
                    onClick={() => setJdInputMethod("paste")}
                  >
                    Paste Text
                  </button>
                </div>

                {jdInputMethod === "upload" ? (
                  <div>
                    {!jdFile ? (
                      <div 
                        className={`upload-zone ${jdDragOver ? "dragover" : ""}`}
                        onDragOver={(e) => handleDragOver(e, setJdDragOver)}
                        onDragLeave={(e) => handleDragLeave(e, setJdDragOver)}
                        onDrop={(e) => handleDrop(e, setJdDragOver, setJdFile, setJdFileStatus, setJobDescription)}
                      >
                        <input 
                          type="file" 
                          id="jd-upload" 
                          style={{ display: "none" }}
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileChange(e, setJdFile, setJdFileStatus, setJobDescription)}
                        />
                        <label htmlFor="jd-upload" style={{ cursor: "pointer", width: "100%" }}>
                          <Upload className="upload-icon" size={24} />
                          <p className="upload-text">Drag JD file here or click to browse</p>
                          <span className="upload-hint">Supports PDF, DOCX, Images</span>
                        </label>
                      </div>
                    ) : (
                      <div className="file-chip">
                        <div className="file-info">
                          <FileText className="file-icon" size={16} />
                          <div className="file-details">
                            <span className="file-name">{jdFile.name}</span>
                            <span className="file-size">{(jdFile.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`file-status status-${jdFileStatus}`}>
                            {jdFileStatus === "extracting" && "Parsing..."}
                            {jdFileStatus === "success" && "Ready"}
                            {jdFileStatus === "error" && "Error"}
                          </span>
                          <button 
                            className="btn-view-file" 
                            type="button"
                            title="View uploaded Job Description"
                            onClick={() => {
                              setPreviewTitle(jdFile?.name || "Job Description");
                              setPreviewText(jobDescription);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button className="btn-remove-file" onClick={() => removeFile(setJdFile, setJdFileStatus, setJobDescription)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea 
                    className="custom-textarea"
                    style={{ height: "140px" }}
                    placeholder="Paste the target job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                )}
              </div>

              {errorMessage && (
                <div className="no-keywords-alert" style={{ background: "var(--danger-bg)", color: "#f87171", border: "1px solid var(--danger-border)" }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <button 
                className="btn-analyze"
                disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim()}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <div className="spinner"></div>
                    <span>Analyzing Resume...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Run Optimization Analysis</span>
                  </>
                )}
              </button>

            </div>
          </div>
        </section>

        {/* Column 2: Dashboard metrics */}
        <section className="workspace-panel results-panel">
          <div className="panel-header">
            <TrendingUp size={18} />
            <h2>2. Analysis Insights</h2>
          </div>

          <div className="panel-body glass-panel" style={{ display: "flex", flexDirection: "column" }}>
            {isAnalyzing ? (
              /* Scanning step loader */
              <div className="loading-panel">
                <div className="placeholder-illustration" style={{ animation: "pulse-glow 1.5s infinite" }}>
                  <RefreshCw size={40} className="upload-icon" style={{ animation: "spin 2s linear infinite" }} />
                </div>
                <h3>Evaluating Resume Alignment</h3>
                <p>Gemini LLM is cross-referencing keywords, checking compliance, and formulating coaching metrics.</p>
                
                <div className="loading-steps">
                  <div className={`loading-step-item ${loadingStep === 1 ? "active" : loadingStep > 1 ? "completed" : ""}`}>
                    <div className="step-indicator-dot">
                      {loadingStep > 1 && <CheckCircle2 size={12} />}
                    </div>
                    <span>Parsing Resume & Layout text</span>
                  </div>
                  <div className={`loading-step-item ${loadingStep === 2 ? "active" : loadingStep > 2 ? "completed" : ""}`}>
                    <div className="step-indicator-dot">
                      {loadingStep > 2 && <CheckCircle2 size={12} />}
                    </div>
                    <span>Computing ATS match scoring matrix</span>
                  </div>
                  <div className={`loading-step-item ${loadingStep === 3 ? "active" : loadingStep > 3 ? "completed" : ""}`}>
                    <div className="step-indicator-dot">
                      {loadingStep > 3 && <CheckCircle2 size={12} />}
                    </div>
                    <span>Generating recommendations & jobs</span>
                  </div>
                </div>
              </div>
            ) : !analysisResults ? (
              /* Blank Dashboard placeholder */
              <div className="empty-placeholder">
                <div className="placeholder-illustration">
                  <FileCheck size={40} />
                </div>
                <h3>Insights Dashboard</h3>
                <p>Upload your resume details and target job description, then click "Run Optimization Analysis" to get your ATS Match Score, skills breakdown, and career suggestions.</p>
              </div>
            ) : (
              /* Populated Dashboard */
              <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px", overflow: "hidden" }}>
                
                {/* Score & Summary Grid */}
                <div className="dashboard-grid">
                  <div className="ats-score-card glass-panel" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <div className="radial-container">
                      <svg width="110" height="110">
                        <circle cx="55" cy="55" r={radius} className="radial-circle-bg" />
                        <circle 
                          cx="55" 
                          cy="55" 
                          r={radius} 
                          className="radial-circle-fill" 
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          stroke={getScoreColor(scoreVal)}
                        />
                      </svg>
                      <div className="radial-text">{scoreVal}%</div>
                    </div>
                    <span className="score-label" style={{ color: getScoreColor(scoreVal) }}>
                      {scoreVal >= 80 ? "High Match" : scoreVal >= 50 ? "Average" : "Low Match"}
                    </span>
                  </div>

                  <div className="summary-card glass-panel" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <h3>Executive Summary</h3>
                    <p className="summary-text">{analysisResults.profile_summary}</p>
                  </div>
                </div>

                {/* Info Navigation Tabs */}
                <nav className="results-tabs">
                  <button 
                    className={`tab-link ${activeTab === "score" ? "active" : ""}`}
                    onClick={() => setActiveTab("score")}
                  >
                    Skills Breakdown
                  </button>
                  <button 
                    className={`tab-link ${activeTab === "suggestions" ? "active" : ""}`}
                    onClick={() => setActiveTab("suggestions")}
                  >
                    Improvement Suggestions
                  </button>
                  <button 
                    className={`tab-link ${activeTab === "jobs" ? "active" : ""}`}
                    onClick={() => setActiveTab("jobs")}
                  >
                    Recommended Roles
                  </button>
                </nav>

                {/* Tab content panel */}
                <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                  
                  {/* TAB 1: SKILLS */}
                  {activeTab === "score" && (
                    <div className="skills-tab-content">
                      <div className="skills-subgroup">
                        <h3 className="missing">
                          <AlertCircle size={14} />
                          <span>Missing Keywords ({analysisResults.missing_keywords?.length || 0})</span>
                        </h3>
                        {analysisResults.missing_keywords && analysisResults.missing_keywords.length > 0 ? (
                          <div className="badge-container">
                            {analysisResults.missing_keywords.map((kw, i) => (
                              <span key={i} className="keyword-tag">
                                <span>+</span> {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="no-keywords-alert">
                            <CheckCircle2 size={14} />
                            <span>Outstanding! No major keywords missing.</span>
                          </div>
                        )}
                      </div>

                      <div className="skills-subgroup">
                        <h3 className="extracted">
                          <CheckCircle2 size={14} />
                          <span>Extracted Resume Skills ({analysisResults.extracted_skills?.length || 0})</span>
                        </h3>
                        {analysisResults.extracted_skills && analysisResults.extracted_skills.length > 0 ? (
                          <div className="badge-container">
                            {analysisResults.extracted_skills.map((skill, i) => (
                              <span key={i} className="skill-tag">{skill}</span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>No specific skills extracted.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SUGGESTIONS */}
                  {activeTab === "suggestions" && (
                    <div className="suggestions-tab-content">
                      {analysisResults.resume_suggestions && analysisResults.resume_suggestions.length > 0 ? (
                        analysisResults.resume_suggestions.map((sug, i) => {
                          const impactClass = (sug.impact || "Medium").toLowerCase().trim();
                          return (
                            <div key={i} className={`suggestion-item-card glass-panel ${impactClass}`}>
                              <div className="suggestion-item-meta">
                                <span className="suggestion-category">[{sug.category || "General"}]</span>
                                <span className={`suggestion-impact-badge ${impactClass}`}>
                                  {sug.impact || "Medium"} Impact
                                </span>
                              </div>
                              <p className="suggestion-text">{sug.text}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-keywords-alert">
                          <CheckCircle2 size={14} />
                          <span>Your resume content matches all criteria perfectly. No suggestions!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: JOBS */}
                  {activeTab === "jobs" && (
                    <div className="jobs-tab-content">
                      {analysisResults.job_recommendations && analysisResults.job_recommendations.length > 0 ? (
                        analysisResults.job_recommendations.map((job, i) => (
                          <div key={i} className="job-rec-card glass-panel">
                            <div className="job-header">
                              <Briefcase size={16} color="var(--primary)" />
                              <h4 className="job-title">{job.title}</h4>
                            </div>
                            <p className="job-rationale">{job.reason}</p>
                            
                            {job.skills_needed && job.skills_needed.length > 0 && (
                              <div className="job-skills">
                                <span className="job-skills-label">Skills to Highlight</span>
                                <div className="badge-container">
                                  {job.skills_needed.map((s, idx) => (
                                    <span key={idx} className="skill-tag" style={{ fontSize: "11px", padding: "4px 8px" }}>{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="job-links">
                              <a 
                                href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="job-board-btn linkedin"
                              >
                                <span>LinkedIn</span>
                                <ExternalLink size={10} />
                              </a>
                              <a 
                                href={`https://www.indeed.com/jobs?q=${encodeURIComponent(job.title)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="job-board-btn indeed"
                              >
                                <span>Indeed</span>
                                <ExternalLink size={10} />
                              </a>
                              <a 
                                href={`https://www.google.com/search?q=${encodeURIComponent(job.title)}+jobs`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="job-board-btn google"
                              >
                                <span>Google Jobs</span>
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>No matching roles compiled.</span>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        </section>

        {/* Column 3: AI Career Coach chatbot */}
        <section className="workspace-panel chat-panel">
          <div className="panel-header">
            <Bot size={18} />
            <h2>3. AI Resume Coach</h2>
          </div>

          <div className="panel-body glass-panel" style={{ padding: "16px" }}>
            {!analysisResults ? (
              <div className="empty-placeholder">
                <div className="placeholder-illustration">
                  <MessageSquare size={40} />
                </div>
                <h3>Career Coach Offline</h3>
                <p>Run the resume analysis first to unlock the interactive coaching assistant.</p>
              </div>
            ) : (
              <div className="chat-container">
                
                {/* Revised Recheck Zone */}
                <div className="recheck-zone">
                  <div>
                    <span className="recheck-label">Compare Revised Resume</span>
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="recheck-upload" 
                      style={{ display: "none" }}
                      accept=".pdf,.docx,.png,.jpg,.jpeg"
                      onChange={handleRevisedResume}
                    />
                    <label htmlFor="recheck-upload" className="recheck-btn-browse" style={{ cursor: "pointer" }}>
                      {revisedFileStatus === "extracting" ? "Parsing..." : "Upload & Recheck"}
                    </label>
                  </div>
                </div>

                {/* Conversational Dialog */}
                <div className="chat-history">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`chat-bubble-wrapper ${msg.role === "user" ? "user" : "coach"}`}>
                      <div className={`chat-bubble ${msg.role === "user" ? "user" : "coach"}`}>
                        {formatChatMessage(msg.content)}
                      </div>
                    </div>
                  ))}
                  
                  {isSendingChat && (
                    <div className="chat-bubble-wrapper coach">
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatHistoryEndRef} />
                </div>

                {/* Message input */}
                <form className="chat-input-wrapper" onSubmit={handleSendChat}>
                  <textarea 
                    className="chat-textarea"
                    placeholder="Ask the coach (e.g. 'How can I add Java...')"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat(e);
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn-send-message"
                    disabled={!chatInput.trim() || isSendingChat}
                  >
                    <Send size={14} />
                  </button>
                </form>

              </div>
            )}
          </div>
        </section>

      </main>

      {/* File Preview Modal */}
      {isPreviewOpen && (
        <div className="preview-modal-overlay" onClick={() => setIsPreviewOpen(false)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>
                <FileText size={18} />
                <span>File Preview: {previewTitle}</span>
              </h3>
              <button className="preview-modal-close" onClick={() => setIsPreviewOpen(false)}>
                &times;
              </button>
            </div>
            <div className="preview-modal-body">
              <pre>{previewText || "No text extracted yet."}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

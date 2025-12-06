import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- Constants & Configuration ---

const CURRICULUM = [
  { 
    id: "all", 
    title: "Full Curriculum (Model Set)", 
    structure: { groupA: 10, groupB: 12, groupC: 4 }, // Standard Exam Set
    desc: "A standard model set covering Units 1-7 (System, Number, Block Coding, Web, Internet, Cyber Security, and Python)."
  },
  { 
    id: "unit1", 
    title: "Unit 1: Computer System", 
    structure: { groupA: 50, groupB: 30, groupC: 20 }, 
    desc: "Includes IPOS, Hardware, Software, History, Generations."
  },
  { 
    id: "unit2", 
    title: "Unit 2: Number System", 
    structure: { groupA: 50, groupB: 30, groupC: 0 }, 
    desc: "Binary, Decimal, Octal, Hex conversions & Binary Arithmetic. (No Long Questions)"
  },
  { 
    id: "unit3", 
    title: "Unit 3: Block Programming", 
    structure: { groupA: 50, groupB: 30, groupC: 0 }, 
    desc: "Scratch concepts, Logic, Algorithms. (No Long Questions)"
  },
  { 
    id: "unit4", 
    title: "Unit 4: Web Technology", 
    structure: { groupA: 50, groupB: 30, groupC: 20 }, 
    desc: "HTML Structure, Tags, Forms, CSS. (Includes HTML Coding Long Question)"
  },
  { 
    id: "unit5", 
    title: "Unit 5: Internet & Social Media", 
    structure: { groupA: 50, groupB: 30, groupC: 0 }, 
    desc: "IoT, Cloud, Search Engines, Social Media Ethics. (No Long Questions)"
  },
  { 
    id: "unit6", 
    title: "Unit 6: Cyber Security", 
    structure: { groupA: 50, groupB: 30, groupC: 0 }, 
    desc: "Digital Footprint, Malware, Ethics, Cyber Law. (No Long Questions)"
  },
  { 
    id: "unit7", 
    title: "Unit 7: Concept of Programming", 
    structure: { groupA: 50, groupB: 30, groupC: 20 }, 
    desc: "Python Syntax, Variables, Loops, Conditionals. (Includes Programming Long Question)"
  },
];

const DOMAIN_FOCUS = [
  { id: "balanced", label: "Balanced (CDC Spec Grid)" },
  { id: "knowledge", label: "Knowledge Focus (Recall/Define)" },
  { id: "understanding", label: "Understanding Focus (Explain/Diff)" },
  { id: "application", label: "Application Focus (Solve/Code)" },
  { id: "high_ability", label: "Higher Ability Focus (Analyze/Justify)" },
];

// --- Types ---

interface Question {
  id: number;
  section: "Group A" | "Group B" | "Group C";
  type: string;
  cognitiveLevel: string;
  question: string;
  options?: string[]; // For MCQs
  answer: string;
  marks: number;
}

// --- Components ---

const App = () => {
  const [selectedUnit, setSelectedUnit] = useState(CURRICULUM[0].id);
  const [domainFocus, setDomainFocus] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  const generateQuestions = async () => {
    setLoading(true);
    setQuestions([]);
    setShowAnswers({});

    try {
      // Access API key from globally polyfilled process.env
      // Note: window.process is set in index.html
      const apiKey = process.env.API_KEY || "";
      
      if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        alert("API Key is missing or invalid! Please edit index.html to add your Gemini API Key.");
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const unitData = CURRICULUM.find((u) => u.id === selectedUnit);
      if (!unitData) return;

      const { title, structure, desc } = unitData;
      const focusLabel = DOMAIN_FOCUS.find((d) => d.id === domainFocus)?.label;
      
      // Dynamic Prompt Construction based on Grid Structure
      let structurePrompt = "";
      
      if (structure.groupA > 0) {
        structurePrompt += `
        1. **Group A: Multiple Choice Questions (MCQ)**
           - Generate exactly ${structure.groupA} MCQs.
           - Provide 4 distinct options for each.
           - Marks: 1 mark each.`;
      } else {
        structurePrompt += `\n        1. **Group A**: DO NOT GENERATE any questions for this section.`;
      }

      if (structure.groupB > 0) {
        structurePrompt += `
        2. **Group B: Short Answer Questions**
           - Generate exactly ${structure.groupB} Short Answer questions.
           - Marks: 2 marks each.
           - Keep answers concise.`;
      } else {
        structurePrompt += `\n        2. **Group B**: DO NOT GENERATE any questions for this section.`;
      }

      if (structure.groupC > 0) {
        structurePrompt += `
        3. **Group C: Long Answer / Programming Questions**
           - Generate exactly ${structure.groupC} Long question(s).
           - Marks: 4 marks each.
           - Focus on practical coding or detailed explanation.`;
      } else {
        structurePrompt += `\n        3. **Group C**: DO NOT GENERATE any questions for this section. The curriculum grid for this unit does not include long answers.`;
      }

      const prompt = `
        You are an expert examiner for Grade 9 Computer Science following the Nepal CDC (Curriculum Development Centre) Specification Grid (Updated 2080).
        
        **Target Unit**: "${title}"
        **Context/Scope**: ${desc}
        **Cognitive Focus**: ${focusLabel}

        **SYLLABUS RESTRICTIONS (STRICTLY FOLLOW)**:
        - **Programming Language**: Use **PYTHON** only. Do NOT use QBASIC.
        - **Office Package**: Do NOT ask questions about MS Word, MS Excel, PowerPoint, or MS Access.
        - **Allowed Topics**: Computer System, Number System, Block Coding (Scratch), Web Tech (HTML/CSS), Internet/IoT, Cyber Security, Python Programming.

        **Specification Grid Structure Requirements**:
        ${structurePrompt}

        **Cognitive Domain Distribution Rules (STRICT)**:
        - Even with the high number of questions, you MUST strictly distribute them across:
          1. **Knowledge** (Recall, Define, List) ~20%
          2. **Understanding** (Explain, Differentiate, Compare) ~30%
          3. **Application** (Solve, Calculate, Write Code, Convert) ~40%
          4. **Higher Ability** (Analyze, Justify, Design) ~10%
        
        **Specific Unit Rules**:
        - If "Number System": Group B MUST be calculation/conversion (Application).
        - If "Web Technology": Group C MUST be practical HTML/CSS coding.
        - If "Concept of Programming": Group C MUST be practical Python coding.
        - Do not output sections that have a count of 0.

        Generate a JSON array of questions. Ensure the output is valid JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                section: { type: Type.STRING, enum: ["Group A", "Group B", "Group C"] },
                type: { type: Type.STRING, description: "MCQ, Short Answer, Long Answer" },
                cognitiveLevel: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }, 
                  description: "List of 4 options for MCQs only. Leave empty for others." 
                },
                answer: { type: Type.STRING },
                marks: { type: Type.INTEGER }
              },
              required: ["id", "section", "type", "cognitiveLevel", "question", "answer", "marks"]
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        setQuestions(data);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("Failed to generate questions. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (id: number) => {
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadDoc = (withAnswers: boolean) => {
    const unitTitle = CURRICULUM.find((u) => u.id === selectedUnit)?.title || "Exam Paper";
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    
    // Build HTML Content
    let htmlContent = `
      <div style="text-align: center; font-family: 'Times New Roman', serif; margin-bottom: 20px;">
        <h2>Grade 9 Computer Science</h2>
        <h3>${unitTitle}</h3>
        <p><strong>${withAnswers ? "Marking Scheme / Answer Key" : "Question Bank / Worksheet"}</strong></p>
        <p>Full Marks: ${totalMarks}</p>
      </div>
      <hr/>
    `;

    const sections = [
      { id: "Group A", title: "Group A: Multiple Choice Questions (1 Mark Each)" },
      { id: "Group B", title: "Group B: Short Answer Questions (2 Marks Each)" },
      { id: "Group C", title: "Group C: Long Answer Questions (4 Marks Each)" }
    ];

    sections.forEach(sec => {
      const sectionQuestions = questions.filter(q => q.section === sec.id);
      if (sectionQuestions.length === 0) return;

      htmlContent += `<h3 style="margin-top: 20px;">${sec.title}</h3>`;
      
      sectionQuestions.forEach((q, idx) => {
        htmlContent += `<p style="margin-bottom: 5px;"><strong>${idx + 1}. ${q.question}</strong> [${q.marks}]</p>`;
        
        if (sec.id === "Group A" && q.options) {
          htmlContent += `<div style="margin-left: 20px; margin-bottom: 10px;">`;
          q.options.forEach((opt, i) => {
            htmlContent += `<div>${String.fromCharCode(65 + i)}. ${opt}</div>`;
          });
          htmlContent += `</div>`;
        }

        if (withAnswers) {
           htmlContent += `
             <div style="background-color: #f0f0f0; padding: 10px; border: 1px solid #ccc; margin-bottom: 15px; font-family: sans-serif; font-size: 0.9em;">
               <strong>Correct Answer:</strong> ${q.answer} <br/>
               <span style="color: #666; font-size: 0.8em;">Cognitive Domain: ${q.cognitiveLevel}</span>
             </div>
           `;
        } else {
           htmlContent += `<div style="margin-bottom: 15px;"></div>`;
        }
      });
    });

    const fullHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${unitTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', fullHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${unitTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${withAnswers ? 'scheme' : 'questions'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLevelColor = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes("knowledge")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (l.includes("understanding")) return "bg-green-100 text-green-800 border-green-200";
    if (l.includes("application")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (l.includes("high")) return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-gray-100 text-gray-800";
  };

  const renderSection = (sectionName: string, title: string) => {
    const sectionQuestions = questions.filter(q => q.section === sectionName);
    if (sectionQuestions.length === 0) return null;

    return (
      <div className="section-container">
        <h2 className="section-title">{title}</h2>
        <div className="questions-grid">
          {sectionQuestions.map((q) => (
            <div key={q.id} className="question-card">
              <div className="q-meta">
                <span className={`level-badge ${getLevelColor(q.cognitiveLevel)}`}>
                  {q.cognitiveLevel}
                </span>
                <span className="marks-badge">{q.marks} Marks</span>
              </div>
              
              <div className="q-content">
                <div className="q-text">{q.question}</div>
                
                {/* Render Options for MCQs */}
                {q.section === "Group A" && q.options && (
                  <div className="mcq-options">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="mcq-option">
                        <span className="opt-letter">{String.fromCharCode(65 + idx)}.</span>
                        <span className="opt-text">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                className="toggle-btn"
                onClick={() => toggleAnswer(q.id)}
              >
                {showAnswers[q.id] ? "Hide Answer" : "Show Answer"}
              </button>
              
              {showAnswers[q.id] && (
                <div className="answer-section">
                  <div className="answer-text">
                    {q.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <style>{`
        :root {
          --primary: #2563eb;
          --primary-hover: #1d4ed8;
          --bg: #f8fafc;
          --card-bg: #ffffff;
          --text: #1e293b;
          --text-secondary: #64748b;
          --border: #e2e8f0;
          --section-header: #334155;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 20px;
          line-height: 1.5;
        }
        .app-container {
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .header h1 {
          font-size: 2rem;
          color: var(--primary);
          margin: 0;
        }
        .header p {
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }
        .controls {
          background: var(--card-bg);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
          margin-bottom: 2rem;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        select {
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          cursor: pointer;
        }
        button.generate-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        button.generate-btn:hover {
          background: var(--primary-hover);
        }
        button.generate-btn:disabled {
          background: var(--text-secondary);
          cursor: not-allowed;
        }
        
        .action-bar {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-bottom: 2rem;
          padding: 1rem;
          background: #e2e8f0;
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .download-btn {
          background: white;
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .download-btn:hover {
          background: #f1f5f9;
          border-color: var(--primary);
          color: var(--primary);
        }
        .download-btn.scheme {
          color: var(--primary);
          border-color: var(--primary);
        }

        .section-container {
          margin-bottom: 3rem;
        }
        .section-title {
          font-size: 1.5rem;
          color: var(--section-header);
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--border);
        }
        
        .questions-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .question-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          transition: box-shadow 0.2s;
          position: relative;
        }
        .question-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .q-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 0.8rem;
        }
        .level-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-width: 1px;
          border-style: solid;
        }
        /* Level Colors */
        .bg-blue-100 { background-color: #dbeafe; }
        .text-blue-800 { color: #1e40af; }
        .border-blue-200 { border-color: #bfdbfe; }
        
        .bg-green-100 { background-color: #dcfce7; }
        .text-green-800 { color: #166534; }
        .border-green-200 { border-color: #bbf7d0; }
        
        .bg-yellow-100 { background-color: #fef9c3; }
        .text-yellow-800 { color: #854d0e; }
        .border-yellow-200 { border-color: #fde047; }
        
        .bg-purple-100 { background-color: #f3e8ff; }
        .text-purple-800 { color: #6b21a8; }
        .border-purple-200 { border-color: #e9d5ff; }

        .marks-badge {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .q-text {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        /* MCQ Options Styling */
        .mcq-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .mcq-option {
          background: #f8fafc;
          border: 1px solid var(--border);
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.95rem;
          display: flex;
          gap: 0.5rem;
        }
        .opt-letter {
          font-weight: 600;
          color: var(--primary);
        }

        .answer-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px dashed var(--border);
        }
        .toggle-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .toggle-btn:hover {
          text-decoration: underline;
        }
        .answer-text {
          margin-top: 0.75rem;
          background: #f1f5f9;
          padding: 1rem;
          border-radius: 8px;
          font-family: monospace;
          color: #334155;
          white-space: pre-wrap;
        }
        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }
        .spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 4px solid var(--border);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .controls {
            grid-template-columns: 1fr;
          }
          .q-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .mcq-options {
            grid-template-columns: 1fr;
          }
          .action-bar {
            justify-content: center;
          }
        }
      `}</style>

      <header className="header">
        <h1>Grade 9 Computer Science</h1>
        <p>Specification Grid Based Question Generator (CDC Nepal)</p>
      </header>

      <section className="controls">
        <div className="control-group">
          <label htmlFor="unit-select">Curriculum Unit</label>
          <select 
            id="unit-select" 
            value={selectedUnit} 
            onChange={(e) => setSelectedUnit(e.target.value)}
          >
            {CURRICULUM.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.title}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="domain-select">Specification Grid Focus</label>
          <select 
            id="domain-select"
            value={domainFocus}
            onChange={(e) => setDomainFocus(e.target.value)}
          >
            {DOMAIN_FOCUS.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        <button 
          className="generate-btn"
          onClick={generateQuestions}
          disabled={loading}
        >
          {loading ? "Analyzing Curriculum..." : "Generate Practice Set"}
        </button>
      </section>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Consulting Specification Grid & Generating Large Practice Set...</p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <>
          <div className="action-bar">
            <button className="download-btn" onClick={() => downloadDoc(false)}>
              📄 Download Question Bank (.doc)
            </button>
            <button className="download-btn scheme" onClick={() => downloadDoc(true)}>
              📝 Download Marking Scheme (.doc)
            </button>
          </div>

          <div className="questions-list">
            {renderSection("Group A", "Group A: Multiple Choice Questions (1 Mark Each)")}
            {renderSection("Group B", "Group B: Short Answer Questions (2 Marks Each)")}
            {renderSection("Group C", "Group C: Long Answer Questions (4 Marks Each)")}
          </div>
        </>
      )}
      
      {!loading && questions.length === 0 && (
        <div style={{textAlign: 'center', color: '#64748b', marginTop: '2rem'}}>
          <p>Select a Unit and click "Generate Practice Set" to create a question bank.</p>
        </div>
      )}
    </div>
  );
};

// Direct render with safety check
const rootElement = document.getElementById("root");
if (rootElement) {
    try {
      const root = createRoot(rootElement);
      root.render(<App />);
    } catch (e) {
      console.error("Failed to render app:", e);
      rootElement.innerHTML = '<div style="color:red; padding:20px;">Failed to load application. Check console for details.</div>';
    }
} else {
    console.error("Root element not found");
}
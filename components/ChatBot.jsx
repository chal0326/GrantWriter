// In components/ChatBot.jsx
import React, { useState, useEffect, useCallback } from 'react';

const STAGES = {
  INITIAL: 'initial',
  ANALYZING: 'analyzing',
  SECTIONS_AVAILABLE: 'sections_available', // Indicate analysis is done, and sections can be selected
  IMPROVING: 'improving',
  IMPROVEMENTS_AVAILABLE: 'improvements_available', // Indicate improvement options are ready
  REVIEWING: 'reviewing',
  FINAL_DRAFT_AVAILABLE: 'final_draft_available',
};

const ChatBot = ({ draft, isLocked, onNewDraft }) => {
  const [stage, setStage] = useState(STAGES.INITIAL);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [improvementOptions, setImprovementOptions] = useState({});
  const [finalDraft, setFinalDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For visual feedback

  // 1. Submit for Review (One-time analysis)
  const analyzeDraft = useCallback(async () => {
    if (!draft || stage !== STAGES.INITIAL) return; // Prevent re-analysis
    setIsLoading(true);
    setStage(STAGES.ANALYZING);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'critique', text: draft }),
      });
      const data = await response.json();
      setAnalysisResults(data);
      setStage(STAGES.SECTIONS_AVAILABLE);
    } catch (error) {
      console.error('Error analyzing draft:', error);
      // Handle error appropriately (e.g., set an error state)
    } finally {
      setIsLoading(false);
    }
  }, [draft, stage]);

  useEffect(() => {
    if (draft && stage === STAGES.INITIAL) {
      analyzeDraft(); // Initial analysis when draft is available
    }
  }, [draft, stage, analyzeDraft]); // Dependencies are crucial

  // 2. Select sections for improvement
  const handleSectionSelect = (sectionId) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  // 3. Get Improvements for selected sections
  const handleGetImprovements = async () => {
    if (selectedSections.length === 0 || stage !== STAGES.SECTIONS_AVAILABLE) return;
    setIsLoading(true);
    setStage(STAGES.IMPROVING);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'improve', 
          text: draft, 
          sections: selectedSections 
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get improvements');
      }
      console.log('Improvement options received:', data);
      setImprovementOptions(data.improvements || {});
      setStage(STAGES.IMPROVEMENTS_AVAILABLE);
    } catch (error) {
      console.error('Error getting improvements:', error);
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Choose replacements
  const handleOptionSelect = (sectionId, optionIndex) => {
    setSelectedVersions(prev => ({
      ...prev,
      [sectionId]: optionIndex
    }));
  };

  // 5. Get Final Draft (This might be implicit after choosing replacements)
  // ... (Logic for compiling the final draft based on selections)

  // 6. Save or Start Over
  const handleSave = async () => {
    if (!finalDraft) return;
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: finalDraft }),
      });
      if (response.ok) {
        alert('Proposal saved!');
      } else {
        alert('Error saving proposal.');
      }
    } catch (error) {
      console.error('Error saving proposal:', error);
    }
  };

  const handleNewDraft = () => {
    setStage(STAGES.INITIAL);
    setAnalysisResults(null);
    setSelectedSections([]);
    setImprovementOptions({});
    setFinalDraft(null);
    onNewDraft(); // Callback to parent to reset the draft editor
  };

  return (
    <div>
      <h2>AI Assistant</h2>
      {isLoading && <p>Loading...</p>}

      {stage === STAGES.ANALYZING && <p>Analyzing your draft...</p>}

      {stage === STAGES.SECTIONS_AVAILABLE && analysisResults && (
        <div>
          <h3>Analysis Feedback</h3>
          {/* Render feedback from analysisResults, allow section selection */}
          {analysisResults.sections.map((section) => (
            <div key={section.id}>
              <p>{section.text}</p>
              <button onClick={() => handleSectionSelect(section.id)}>
                {selectedSections.includes(section.id) ? 'Deselect' : 'Select for Improvement'}
              </button>
            </div>
          ))}
          <button onClick={handleGetImprovements} disabled={selectedSections.length === 0}>
            Get Improvement Options
          </button>
        </div>
      )}

      {stage === STAGES.IMPROVEMENTS_AVAILABLE && improvementOptions && (
        <div>
          <h3>Improvement Options</h3>
          {Object.entries(improvementOptions).map(([sectionId, options]) => (
            <div key={sectionId}>
              <h4>{analysisResults.sections.find(s => s.id === sectionId)?.name}</h4>
              <div className="original-text">
                <h5>Original</h5>
                <p>{analysisResults.sections.find(s => s.id === sectionId)?.text}</p>
              </div>
              {Array.isArray(options) && options.map((option, index) => (
                <div key={index} className="option">
                  <h5>Option {index + 1}</h5>
                  <p>{option}</p>
                  <button 
                    onClick={() => handleOptionSelect(sectionId, index)}
                    className={selectedVersions[sectionId] === index ? 'selected' : ''}
                  >
                    Select This Version
                  </button>
                </div>
              ))}
            </div>
          ))}
          <button 
            onClick={handleSubmitSelections}
            disabled={!Object.keys(selectedVersions).length}
          >
            Get Final Draft
          </button>
        </div>
      )}

      {stage === STAGES.FINAL_DRAFT_AVAILABLE && finalDraft && (
        <div>
          <h3>Final Draft</h3>
          <p>{finalDraft}</p>
          <button onClick={handleSave}>Save Proposal</button>
          <button onClick={handleNewDraft}>Start Over</button>
        </div>
      )}

      {stage === STAGES.INITIAL && !isLocked && <p>Submit your draft for review.</p>}
    </div>
  );
};

export default ChatBot;
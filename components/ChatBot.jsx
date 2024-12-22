import { useState, useEffect } from 'react';
import { Card, CardBody, Spinner, Button, Textarea, Radio, RadioGroup } from '@nextui-org/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SECTIONS = [
  { value: 'opening_hook', label: 'Opening Hook' },
  { value: 'impact_statement', label: 'Impact Statement' },
  { value: 'mission_statement', label: 'Mission Statement' },
  { value: 'goals_objectives', label: 'Goals & Objectives' },
  { value: 'budget_justification', label: 'Budget Justification' }
];

const INSTRUCTIONS = `
### How to Use the Grant Writer Assistant

1. **Review Your Draft Analysis**
   - Green sections: Well-written parts that need no changes
   - Yellow sections: Areas that need improvement
   - Review the feedback for each section

2. **Choose Improvements**
   - For sections marked for improvement, you'll see two options
   - Compare the options side by side
   - Click "Use This Option" under your preferred version
   - The selected version will replace the original text

3. **Review the Flow**
   - As you make selections, you'll see your draft update in real-time
   - Good sections remain unchanged
   - Selected improvements replace the original text
   - Everything stays in order for easy reading

4. **Tips for Success**
   - Take your time comparing options
   - Consider how each choice flows with the rest
   - You can always change your selection
   - Focus on maintaining a consistent voice
`;

export default function ChatBot({ draft, onSave, onNewDraft }) {
  const [draftSections, setDraftSections] = useState({});
  const [improvements, setImprovements] = useState({});
  const [selectedVersions, setSelectedVersions] = useState({});
  const [loading, setLoading] = useState(false);
  const [improvementsLoading, setImprovementsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [finalFeedback, setFinalFeedback] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [finalDraft, setFinalDraft] = useState('');
  const [sectionsForImprovement, setSectionsForImprovement] = useState({});
  const [hasRequestedImprovements, setHasRequestedImprovements] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const analyzeDraft = async (draftToAnalyze) => {
    if (!draftToAnalyze || loading || Object.keys(draftSections).length > 0) {
      console.log('Skipping analyzeDraft - no draft, already loading, or sections already exist');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Sending draft for analysis:', draftToAnalyze.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft: draftToAnalyze,
          stage: 'critique'
        }),
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, ok: response.ok, data });

      if (!response.ok) {
        throw new Error(`Failed to get feedback: ${data.error || response.statusText}`);
      }

      if (!data.sections || Object.keys(data.sections).length === 0) {
        console.error('Empty sections received:', data);
        throw new Error('No feedback received from AI - empty sections');
      }
      
      console.log('Setting draft sections:', Object.keys(data.sections));
      setDraftSections(data.sections);
      setHasRequestedImprovements(false);
      setImprovements({});
      setSelectedVersions({});
      setSectionsForImprovement({});
      setIsReviewing(false);
      setIsEditing(false);
    } catch (err) {
      console.error('Error in analyzeDraft:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Network error - please check your connection');
      } else {
        setError(err.message || 'Failed to analyze draft');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (draft && !Object.keys(draftSections).length) {
      analyzeDraft(draft);
    }
  }, [draft]);

  const handleRequestImprovements = async () => {
    const selectedSections = Object.entries(draftSections)
      .filter(([key]) => sectionsForImprovement[key])
      .reduce((acc, [key, section]) => {
        acc[key] = section;
        return acc;
      }, {});

    if (Object.keys(selectedSections).length === 0) {
      setError('Please select at least one section for improvement');
      return;
    }

    setImprovementsLoading(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        Object.entries(selectedSections).map(async ([key, section]) => {
          try {
            console.log(`Requesting improvements for ${section.name}`);
            const response = await fetch('/api/ai', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                draft,
                stage: 'improve',
                section: section.name
              }),
            });

            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || `Failed to get improvements for ${section.name}`);
            }

            return [key, data.options];
          } catch (error) {
            console.error(`Error for ${section.name}:`, error);
            return [key, null];
          }
        })
      );

      const validResults = results.filter(([, options]) => options !== null);
      if (validResults.length === 0) {
        throw new Error('Failed to get improvements for any sections');
      }

      setImprovements(Object.fromEntries(validResults));
      setHasRequestedImprovements(true);
    } catch (error) {
      console.error('Error in handleRequestImprovements:', error);
      setError(error.message);
      setHasRequestedImprovements(false);
    } finally {
      setImprovementsLoading(false);
    }
  };

  const handleSubmitSelections = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build the updated draft by combining original and improved sections
      let updatedDraft = '';
      
      // Go through each section in order
      SECTIONS.forEach(({ value: key }) => {
        const section = draftSections[key];
        if (!section) return;

        // Add the section name
        updatedDraft += `${section.name}\n\n`;

        // If this section has improvements and a selection was made, use the selected improvement
        if (improvements[key] && selectedVersions[key] !== undefined) {
          if (selectedVersions[key] === 'original') {
            updatedDraft += section.content + '\n\n';
          } else {
            updatedDraft += improvements[key][parseInt(selectedVersions[key], 10)] + '\n\n';
          }
        } else {
          // Otherwise use the original content
          updatedDraft += section.content + '\n\n';
        }
      });

      const finalDraftText = updatedDraft.trim();
      setFinalDraft(finalDraftText);
      handleGetFinalReview(finalDraftText);
    } catch (error) {
      console.error('Error in handleSubmitSelections:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetFinalReview = async (draftText) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft: draftText || finalDraft,
          stage: 'final'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get final review');
      }

      setFinalFeedback(data.feedback);
      setIsReviewing(true);
    } catch (error) {
      console.error('Error getting final review:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!finalDraft) {
      setError('No draft to save');
      return;
    }
    console.log('Saving final draft:', finalDraft);
    onSave?.(finalDraft);
  };

  // Autosave functionality
  useEffect(() => {
    const savedDraft = localStorage.getItem('grantWriterDraft');
    if (savedDraft && !draft && !finalDraft) {
      setFinalDraft(savedDraft);
    }
  }, []);

  if (loading && !Object.keys(draftSections).length) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-100">
        <CardBody>
          <p className="text-red-600">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (isReviewing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardBody>
            <h4 className="font-semibold mb-4">Final Review</h4>
            <div className="bg-white p-4 rounded-lg mb-4">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                className="prose max-w-none"
              >
                {finalFeedback}
              </ReactMarkdown>
            </div>
            <div className="bg-white p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Your Draft</h4>
              <div className="whitespace-pre-wrap font-serif">
                {finalDraft}
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button
                color="success"
                onClick={handleSave}
              >
                Save Draft
              </Button>
              <Button
                color="secondary"
                onClick={() => analyzeDraft(finalDraft)}
              >
                Revise This Draft
              </Button>
              <Button
                color="secondary"
                onClick={onNewDraft}
              >
                Start New Draft
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardBody>
            <h4 className="font-semibold mb-4">Review Your Draft</h4>
            <div className="bg-white p-4 rounded-lg mb-4">
              <div className="whitespace-pre-wrap font-serif">
                {finalDraft}
              </div>
            </div>
            <Textarea
              label="Make any adjustments before getting final review"
              value={finalDraft}
              onChange={(e) => setFinalDraft(e.target.value)}
              minRows={10}
              size="lg"
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-4">
              <Button
                color="primary"
                onClick={handleGetFinalReview}
                isLoading={loading}
              >
                Get Final Review
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showInstructions && (
        <Card className="bg-blue-50">
          <CardBody>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-900">Instructions</h3>
              <Button 
                size="sm" 
                color="primary"
                variant="light"
                onClick={() => setShowInstructions(false)}
              >
                Hide
              </Button>
            </div>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              className="prose prose-blue max-w-none"
            >
              {INSTRUCTIONS}
            </ReactMarkdown>
          </CardBody>
        </Card>
      )}

      {improvementsLoading && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <p>Getting improvement suggestions...</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="space-y-8">
        {Object.entries(draftSections).map(([sectionKey, section]) => (
          <Card 
            key={sectionKey}
            className={section.needsWork ? 'bg-yellow-50' : 'bg-green-50'}
          >
            <CardBody>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{section.name}</h3>
                {section.needsWork && !hasRequestedImprovements && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sectionsForImprovement[sectionKey] || false}
                        onChange={(e) => setSectionsForImprovement(prev => ({
                          ...prev,
                          [sectionKey]: e.target.checked
                        }))}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span>Submit for Improvement</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg mb-4">
                <div className="whitespace-pre-wrap font-serif">
                  {section.content}
                </div>
              </div>

              {section.needsWork && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Feedback</h4>
                    <div className="text-gray-700">
                      {section.feedback}
                    </div>
                  </div>

                  {hasRequestedImprovements && improvements[sectionKey]?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold mb-4">Choose a Replacement</h4>
                      <RadioGroup
                        value={selectedVersions[sectionKey]}
                        onValueChange={(value) => 
                          setSelectedVersions(prev => ({
                            ...prev,
                            [sectionKey]: value
                          }))
                        }
                      >
                        <Radio value="original">
                          <div className="ml-2">
                            <h5 className="font-semibold mb-2">Keep Original</h5>
                            <div className="whitespace-pre-wrap font-serif">
                              {section.content}
                            </div>
                          </div>
                        </Radio>
                        {improvements[sectionKey].map((option, index) => (
                          <div key={index} className="mb-4 last:mb-0">
                            <Radio value={String(index)}>
                              <div className="ml-2">
                                <h5 className="font-semibold mb-2">Option {index + 1}</h5>
                                <div className="whitespace-pre-wrap font-serif">
                                  {option}
                                </div>
                              </div>
                            </Radio>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-4 mt-8">
        {!hasRequestedImprovements && (
          <Button
            color="primary"
            onClick={handleRequestImprovements}
            isLoading={improvementsLoading}
            isDisabled={Object.values(sectionsForImprovement).filter(Boolean).length === 0}
          >
            Get Improvements
          </Button>
        )}
        {hasRequestedImprovements && (
          <Button
            color="primary"
            onClick={handleSubmitSelections}
            isLoading={loading}
            isDisabled={Object.entries(draftSections)
              .filter(([key]) => sectionsForImprovement[key])
              .some(([key]) => !selectedVersions[key])}
          >
            Get Final Draft
          </Button>
        )}
      </div>
    </div>
  );
}

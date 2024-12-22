import { useState, useRef } from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import DraftEditor from '../components/DraftEditor';
import ChatBot from '../components/ChatBot';
import ProposalViewer from '../components/ProposalViewer';

export default function Home() {
  const [currentDraft, setCurrentDraft] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isEditorLocked, setIsEditorLocked] = useState(false);
  const proposalViewerRef = useRef();

  const handleDraftSubmit = async (draft) => {
    setCurrentDraft(draft);
    setShowFeedback(true);
    setIsEditorLocked(true);
  };

  const handleNewDraft = () => {
    setCurrentDraft('');
    setShowFeedback(false);
    setIsEditorLocked(false);
  };

  const handleSaveDraft = async (finalDraft) => {
    // Refresh the proposals list after saving
    if (proposalViewerRef.current) {
      proposalViewerRef.current.fetchProposals();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Grant Writer</h1>
          <p className="text-gray-600">
            AI-powered assistant for writing compelling grant proposals
          </p>
        </header>

        <Tabs 
          aria-label="Grant Writer Options"
          className="mb-8"
        >
          <Tab key="write" title="Write">
            <div className="mt-4">
              <DraftEditor 
                onSubmit={handleDraftSubmit}
                isLocked={isEditorLocked}
              />
              {showFeedback && (
                <div className="mt-8">
                  <ChatBot 
                    draft={currentDraft}
                    onSave={handleSaveDraft}
                    onNewDraft={handleNewDraft}
                  />
                </div>
              )}
            </div>
          </Tab>
          <Tab key="proposals" title="Saved Proposals">
            <div className="mt-4">
              <ProposalViewer ref={proposalViewerRef} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}

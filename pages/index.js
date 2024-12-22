// In pages/index.js
import React, { useState } from 'react';
import DraftEditor from '../components/DraftEditor';
import ChatBot from '../components/ChatBot';
import ProposalViewer from '../components/ProposalViewer';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('write');
  const [draft, setDraft] = useState('');
  const [isEditorLocked, setIsEditorLocked] = useState(false);

  const handleDraftSubmit = (submittedDraft) => {
    setDraft(submittedDraft);
    setIsEditorLocked(true);
  };

  const handleNewDraft = () => {
    setDraft('');
    setIsEditorLocked(false);
  };

  return (
    <div>
      <button onClick={() => setActiveTab('write')}>Write</button>
      <button onClick={() => setActiveTab('saved')}>Saved Proposals</button>

      {activeTab === 'write' && (
        <div>
          <DraftEditor onSubmit={handleDraftSubmit} isLocked={isEditorLocked} />
          {isEditorLocked && <ChatBot draft={draft} isLocked={isEditorLocked} onNewDraft={handleNewDraft} />}
        </div>
      )}

      {activeTab === 'saved' && <ProposalViewer />}
    </div>
  );
}
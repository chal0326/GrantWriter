import { useState } from 'react';
import { Textarea, Button } from '@nextui-org/react';

export default function DraftEditor({ onSubmit, isLocked = false }) {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    if (draft.trim()) {
      onSubmit(draft);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Write Your Grant Proposal</h2>
      <Textarea
        placeholder="Start writing your grant proposal here..."
        value={draft}
        onChange={(e) => !isLocked && setDraft(e.target.value)}
        minRows={10}
        size="lg"
        className="w-full"
        isDisabled={isLocked}
      />
      <Button 
        color="primary" 
        onClick={handleSubmit}
        className="w-full"
        isDisabled={isLocked}
      >
        Submit for Review
      </Button>
    </div>
  );
}

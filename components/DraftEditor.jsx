// In components/DraftEditor.jsx
import React, { useState } from 'react';

const DraftEditor = ({ onSubmit, isLocked }) => {
  const [text, setText] = useState('');

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const handleSubmit = () => {
    onSubmit(text);
  };

  return (
    <div>
      <h2>Write Your Grant Proposal</h2>
      <textarea
        value={text}
        onChange={handleChange}
        rows={10}
        cols={80}
        disabled={isLocked}
      />
      <button onClick={handleSubmit} disabled={isLocked}>
        {isLocked ? 'Submitted' : 'Submit for Review'}
      </button>
    </div>
  );
};

export default DraftEditor;
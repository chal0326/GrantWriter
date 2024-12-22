import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const CRITIQUE_PROMPT = `You are an expert grant writer who helps to connect small non-profits and startups led by powerful, strong, BIPOC women with financial abundance that allows the grant recipients to do tremendous good in the world.

Analyze the grant proposal and provide feedback in the following format:

# Section Analysis
For each section below, indicate if it needs improvement (YES/NO) and provide specific feedback:

## Opening Hook
Status: [YES/NO]
Feedback: [Your specific feedback here]

## Impact Statement
Status: [YES/NO]
Feedback: [Your specific feedback here]

## Mission Statement
Status: [YES/NO]
Feedback: [Your specific feedback here]

## Goals & Objectives
Status: [YES/NO]
Feedback: [Your specific feedback here]

## Budget Justification
Status: [YES/NO]
Feedback: [Your specific feedback here]

Be specific in your feedback, explaining exactly what isn't working and why.`;

const IMPROVEMENT_PROMPT = `Based on the critique provided, generate two distinctly different approaches for improving this section: {section}. 

For context, here is the full draft:
{content}

Format your response exactly like this:

Option 1:
[Complete rewrite with first approach - focus on being direct and impactful]

Option 2:
[Complete rewrite with second approach - focus on being descriptive and detailed]

Make each option distinctly different in tone and emphasis. Each option should be complete and ready to use.
Each option should maintain proper formatting and structure.`;

const FINAL_REVIEW_PROMPT = `Review this draft holistically and provide actionable feedback. Consider how well it flows and if it presents a compelling narrative.

Format your response like this:

## Overall Assessment
[Provide a brief evaluation of the draft's effectiveness and potential impact]

## Key Strengths
- [Specific strength with explanation]
- [Specific strength with explanation]
- [Specific strength with explanation]

## Recommended Improvements
- [Specific, actionable improvement suggestion]
- [Specific, actionable improvement suggestion]
- [Specific, actionable improvement suggestion]

## Final Recommendations
[Concrete next steps and suggestions for strengthening the proposal further]`;

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    const { draft, stage, section } = req.body;

    if (!draft) {
      return res.status(400).json({ error: 'Draft content is required' });
    }

    // Clean the draft content
    const cleanDraft = draft.replace(/`/g, '').trim();
    if (!cleanDraft) {
      return res.status(400).json({ error: 'Draft content is empty after cleaning' });
    }

    console.log(`Processing ${stage} request for draft length: ${cleanDraft.length}`);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig,
    });

    let prompt;
    switch (stage) {
      case 'critique':
        prompt = CRITIQUE_PROMPT;
        break;
      case 'improve':
        if (!section) {
          return res.status(400).json({ error: 'Section name is required for improvements' });
        }
        prompt = IMPROVEMENT_PROMPT
          .replace('{section}', section)
          .replace('{content}', cleanDraft);
        break;
      case 'final':
        prompt = FINAL_REVIEW_PROMPT;
        break;
      default:
        return res.status(400).json({ error: 'Invalid stage' });
    }

    console.log(`Sending prompt to AI for ${stage}...`);
    const result = await model.generateContent(prompt + "\n\n" + cleanDraft);
    const response = await result.response;
    const text = response.text();

    console.log(`AI Response for ${stage}:`, text.substring(0, 100) + '...');

    if (!text || text.trim().length === 0) {
      console.error('Empty response from AI');
      return res.status(500).json({ 
        error: 'Empty response from AI',
        details: 'The AI model returned an empty response'
      });
    }

    if (stage === 'improve') {
      // Split on Option 1: and Option 2: specifically
      const parts = text.split(/Option [12]:/);
      if (parts.length < 3) {
        console.error('Invalid improvement format received:', text);
        return res.status(400).json({ 
          error: 'Invalid improvement format',
          details: 'The AI response did not contain properly formatted options'
        });
      }

      const options = [parts[1].trim(), parts[2].trim()];
      return res.status(200).json({ options });

    } else if (stage === 'critique') {
      const sections = {};
      let currentSection = null;
      let currentStatus = null;
      let currentFeedback = [];

      // Process AI response first to get feedback
      const lines = text.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('## ')) {
          // Save previous section if exists
          if (currentSection) {
            const key = currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            sections[key] = {
              name: currentSection,
              needsWork: currentStatus === 'YES',
              feedback: currentFeedback.join('\n').trim(),
              content: '' // Will be populated later
            };
          }

          // Start new section
          currentSection = line.replace('## ', '').trim();
          currentStatus = null;
          currentFeedback = [];
        } else if (line.startsWith('Status:')) {
          currentStatus = line.replace('Status:', '').trim();
        } else if (line.startsWith('Feedback:')) {
          currentFeedback = [line.replace('Feedback:', '').trim()];
        } else if (currentFeedback) {
          currentFeedback.push(line);
        }
      }

      // Save the last section
      if (currentSection) {
        const key = currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        sections[key] = {
          name: currentSection,
          needsWork: currentStatus === 'YES',
          feedback: currentFeedback.join('\n').trim(),
          content: '' // Will be populated later
        };
      }

      // Now extract content from the draft
      let currentDraftSection = null;
      let currentContent = [];
      const draftLines = cleanDraft.split('\n');
      
      for (const line of draftLines) {
        if (line.trim().startsWith('## ')) {
          // Save previous section content
          if (currentDraftSection) {
            const key = currentDraftSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            if (sections[key]) {
              sections[key].content = currentContent.join('\n').trim();
            }
          }
          currentDraftSection = line.replace(/^## /, '').trim();
          currentContent = [];
        } else if (currentDraftSection) {
          currentContent.push(line);
        }
      }

      // Save the last section content
      if (currentDraftSection) {
        const key = currentDraftSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (sections[key]) {
          sections[key].content = currentContent.join('\n').trim();
        }
      }

      if (Object.keys(sections).length === 0) {
        console.error('Failed to parse sections from text:', text);
        return res.status(400).json({ 
          error: 'Invalid critique format',
          details: 'The AI response did not contain properly formatted sections'
        });
      }

      return res.status(200).json({ sections });
    } else {
      return res.status(200).json({ feedback: text });
    }

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process with AI',
      details: error.message 
    });
  }
}

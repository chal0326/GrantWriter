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

    const { action, text, sections } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Clean the text content
    const cleanText = text.replace(/`/g, '').trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'Text content is empty after cleaning' });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig,
    });

    let prompt;
    switch (action) {
      case 'critique':
        prompt = CRITIQUE_PROMPT;
        break;
      case 'improve':
        if (!sections || sections.length === 0) {
          return res.status(400).json({ error: 'Sections are required for improvements' });
        }
        // Handle multiple sections at once
        const improvements = {};
        for (const section of sections) {
          const sectionPrompt = IMPROVEMENT_PROMPT
            .replace('{section}', section)
            .replace('{content}', cleanText);
          
          const result = await model.generateContent(sectionPrompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse the two options
          const parts = text.split(/Option [12]:/);
          if (parts.length < 3) {
            console.error('Invalid improvement format for section:', section);
            continue;
          }
          improvements[section] = [parts[1].trim(), parts[2].trim()];
        }
        return res.status(200).json({ improvements });

      case 'final':
        prompt = FINAL_REVIEW_PROMPT;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    console.log(`Processing ${action} request...`);
    const result = await model.generateContent(prompt + "\n\n" + cleanText);
    const response = await result.response;
    const responseText = response.text();

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    if (action === 'critique') {
      const sections = {};
      let currentSection = null;
      let currentStatus = null;
      let currentFeedback = [];

      const lines = responseText.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('## ')) {
          if (currentSection) {
            const key = currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            sections[key] = {
              id: key,
              name: currentSection,
              needsWork: currentStatus === 'YES',
              feedback: currentFeedback.join('\n').trim(),
              text: '' // Will be populated from the draft
            };
          }
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
          id: key,
          name: currentSection,
          needsWork: currentStatus === 'YES',
          feedback: currentFeedback.join('\n').trim(),
          text: '' // Will be populated from the draft
        };
      }

      // Extract section content from the draft
      let currentDraftSection = null;
      let currentContent = [];
      const draftLines = cleanText.split('\n');
      
      for (const line of draftLines) {
        if (line.trim().startsWith('## ')) {
          if (currentDraftSection) {
            const key = currentDraftSection.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            if (sections[key]) {
              sections[key].text = currentContent.join('\n').trim();
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
          sections[key].text = currentContent.join('\n').trim();
        }
      }

      return res.status(200).json({ sections: Object.values(sections) });
    }

    return res.status(200).json({ feedback: responseText });

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process with AI',
      details: error.message 
    });
  }
}

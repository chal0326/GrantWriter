# Grant Writer App Documentation

## Overview
The Grant Writer App is an advanced tool designed to assist users in writing and improving grant proposals. By leveraging Google AI’s Gemini Flash 2.0 Thinking Experimental model and a robust tech stack, this app not only writes grants but also teaches users how to become better grant writers through guided rewriting and critiques.

### Key Features
- **AI-Powered Assistance**: Uses Google AI’s Gemini Flash 2.0 model, capable of analyzing up to 32,000 tokens, to provide insightful feedback and rewrites.
- **Educational Guidance**: Critiques drafts as if the AI were the grant provider and teaches users how to refine their proposals.
- **Reusable Content Blocks**: Provides rewritten content in cohesive blocks with multiple options for each section to reduce creative pressure.
- **Data Storage**: Stores grant writing drafts, critiques, and final proposals in a Supabase database.
- **Modern UI**: Built using Node.js, Next.js, TailwindCSS, and NextUI for a sleek and intuitive interface.

---

## System Instructions to the AI Model
The system instructions for the Gemini Flash 2.0 model are designed to make the AI function as an expert grant writer. Below are the directives provided to the model:

> "You are an expert grant writer who helps to connect small non-profits and startups led by powerful, strong, BIPOC women with financial abundance that allows the grant recipients to do tremendous good in the world. Critique the grant writing that you are given as if you are the one providing the grant yourself to the writer. Be harsh and pick it apart and explain why things won’t work, don’t just say no. Then make it phenomenal by walking them through how they would be able to get that grant from you. Break the rewrite into cohesive blocks that could potentially be reused again in the future. Give them multiple options to choose from for each block rewrite so it alleviates some of the creative pressure."

---

## Technical Stack
The app is built using the following technologies:

- **Node.js**: Backend logic and API integration.
- **Next.js**: Framework for server-side rendering and API routes.
- **TailwindCSS**: For modern and responsive styling.
- **NextUI**: Pre-styled UI components for fast and aesthetic development.
- **Google AI Node.js SDK**: Integrates the Gemini Flash 2.0 model for content generation.
- **Supabase**: A Postgres database for storing user drafts, critiques, and finalized proposals.

---

## File Structure
```
root
├── pages
│   ├── api
│   │   ├── ai.js         # API route for interacting with Gemini Flash 2.0
│   │   ├── save.js       # API route for saving data to Supabase
│   │   └── fetch.js      # API route for fetching stored drafts or proposals
├── components
│   ├── ChatBot.jsx       # Chat interface for interacting with AI
│   ├── DraftEditor.jsx   # Editor for user’s draft input
│   ├── ProposalViewer.jsx# Displays final proposals
├── styles
│   └── globals.css       # Tailwind global styles
├── .env.local            # Environment variables (e.g., Supabase API keys)
├── next.config.js        # Next.js configuration
├── package.json          # Dependencies
└── README.md             # Documentation
```

---

## Environment Setup
1. Clone the repository.
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies.
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`.
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<Your Supabase URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Supabase Anon Key>
   GOOGLE_AI_API_KEY=<Your Google AI API Key>
   ```

4. Start the development server.
   ```bash
   npm run dev
   ```

---

## Key Features in Detail
### 1. **AI Chatbot**
   - **Functionality**: The chatbot helps users critique and rewrite their drafts.
   - **Interaction**: Users can submit their drafts, receive feedback, and iterate in real-time.
   - **Guided Rewriting**: The AI breaks down rewrites into blocks, offering multiple options for each.

### 2. **Draft Editor**
   - Allows users to input and modify their grant drafts directly within the app.
   - Integrated with the chatbot for seamless feedback.

### 3. **Proposal Storage and Viewer**
   - Saves drafts, feedback, and finalized proposals to Supabase.
   - Allows users to review and download completed proposals.

---

## Supabase Integration
### Database Structure
- **Tables**:
  1. **users**: Stores user information.
  2. **drafts**: Stores user-submitted drafts.
  3. **critiques**: Stores AI-generated critiques and rewritten blocks.
  4. **proposals**: Stores finalized grant proposals.

### API Routes
- **Save Draft**: `POST /api/save`
  - Saves a user’s draft to the database.
- **Fetch Data**: `GET /api/fetch`
  - Retrieves drafts, critiques, or proposals for a user.
- **AI Interaction**: `POST /api/ai`
  - Sends the draft to the Gemini Flash 2.0 model for feedback.

---

## Next Steps
1. Implement the AI interaction layer using the Google AI Node.js SDK.
2. Set up Supabase tables and connect them to the app.
3. Develop a cohesive and intuitive user interface using TailwindCSS and NextUI.
4. Test and refine the AI feedback loop to ensure quality output.

---

## Contribution
We welcome contributions to improve the Grant Writer App. To contribute:
- Fork the repository.
- Create a new branch for your feature.
- Submit a pull request with a detailed description of your changes.

---

## License
This project is licensed under the MIT License. See the LICENSE file for details.



import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Ensure the table exists
const ensureTable = async () => {
  const { error } = await supabase.rpc('create_proposals_if_not_exists');
  if (error && !error.message.includes('already exists')) {
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, content, feedback } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Ensure table exists before inserting
    await ensureTable();

    const { data, error } = await supabase
      .from('proposals')
      .insert([
        {
          title: title || 'Untitled Proposal',
          content,
          feedback,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return res.status(200).json(data?.[0] || null);
  } catch (error) {
    console.error('Save API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to save proposal',
      details: error.message 
    });
  }
}

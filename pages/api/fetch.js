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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure table exists before querying
    await ensureTable();

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return res.status(200).json({ proposals: data || [] });
  } catch (error) {
    console.error('Fetch API Error:', error);
    // Return empty array instead of error to handle initial state
    return res.status(200).json({ proposals: [] });
  }
}

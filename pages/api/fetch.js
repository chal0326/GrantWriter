import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all proposals, ordered by creation date
    const proposals = await prisma.proposal.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ proposals });

  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch proposals',
      details: error.message 
    });
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proposal } = req.body;

    if (!proposal) {
      return res.status(400).json({ error: 'Proposal content is required' });
    }

    // Save the proposal to the database
    const savedProposal = await prisma.proposal.create({
      data: {
        content: proposal,
        createdAt: new Date(),
      },
    });

    return res.status(200).json({ 
      success: true, 
      proposal: savedProposal 
    });

  } catch (error) {
    console.error('Save Error:', error);
    return res.status(500).json({ 
      error: 'Failed to save proposal',
      details: error.message 
    });
  }
}

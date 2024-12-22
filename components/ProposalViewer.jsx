import { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { Card, CardBody, Button, Accordion, AccordionItem } from '@nextui-org/react';

const ProposalViewer = forwardRef((props, ref) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/fetch');
      if (!response.ok) {
        throw new Error('Failed to fetch proposals');
      }
      const data = await response.json();
      setProposals(data.proposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchProposals
  }));

  useEffect(() => {
    fetchProposals();
  }, []);

  const downloadProposal = (proposal) => {
    const blob = new Blob([JSON.stringify(proposal, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal-${proposal.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div>Loading proposals...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Saved Proposals</h2>
      {proposals.length === 0 ? (
        <p>No saved proposals yet.</p>
      ) : (
        <Accordion>
          {proposals.map((proposal) => (
            <AccordionItem
              key={proposal.id}
              aria-label={`Proposal from ${new Date(proposal.created_at).toLocaleDateString()}`}
              title={
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">{proposal.title}</h3>
                    <p className="text-gray-600">{new Date(proposal.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button 
                    color="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadProposal(proposal);
                    }}
                  >
                    Download
                  </Button>
                </div>
              }
            >
              <Card>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Final Draft</h4>
                      <p className="whitespace-pre-wrap">{proposal.content}</p>
                    </div>
                    {proposal.feedback && (
                      <div>
                        <h4 className="font-semibold mb-2">AI Feedback</h4>
                        <p className="whitespace-pre-wrap text-gray-600">{proposal.feedback}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
});

ProposalViewer.displayName = 'ProposalViewer';
export default ProposalViewer;

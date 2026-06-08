import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RisultatiPage from '../RisultatiPage';
import type { Match } from '../../../lib/types';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ date })),
  },
}));

vi.mock('firebase/firestore', () => firestoreMocks);

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

const recalcMocks = vi.hoisted(() => ({
  recalcPointsClient: vi.fn(),
}));

vi.mock('../../../lib/recalcPoints', () => recalcMocks);

const proposalMocks = vi.hoisted(() => ({
  subscribeResultProposals: vi.fn(),
  fetchResultProposalsNow: vi.fn(),
}));

vi.mock('../../../lib/resultProposals', () => proposalMocks);

const matches: Match[] = [
  {
    id: 'match-1',
    phase: 'gironi',
    group: 'A',
    homeTeam: 'Italia',
    awayTeam: 'Canada',
    kickoff: new Date('2026-06-11T20:00:00Z'),
    kickoffSource: 'api',
    result: null,
    score: null,
    locked: false,
  },
];

describe('RisultatiPage', () => {
  beforeEach(() => {
    firestoreMocks.doc.mockClear();
    firestoreMocks.updateDoc.mockReset();
    firestoreMocks.deleteDoc.mockReset();
    firestoreMocks.updateDoc.mockResolvedValue(undefined);
    firestoreMocks.deleteDoc.mockResolvedValue(undefined);
    recalcMocks.recalcPointsClient.mockReset();
    recalcMocks.recalcPointsClient.mockResolvedValue({ playersUpdated: 4, matchesCounted: 1 });
    proposalMocks.fetchResultProposalsNow.mockReset();
    proposalMocks.fetchResultProposalsNow.mockResolvedValue({ configured: true, proposalsUpdated: 1 });
    proposalMocks.subscribeResultProposals.mockReset();
    proposalMocks.subscribeResultProposals.mockImplementation(
      (_gameId: string, cb: (proposals: unknown[]) => void) => {
        cb([
          {
            id: 'match-1',
            matchId: 'match-1',
            homeTeam: 'Italia',
            awayTeam: 'Canada',
            score: '2-0',
            result: '1',
            status: 'pending',
            source: 'api-football',
            fetchedAt: null,
          },
        ]);
        return vi.fn();
      }
    );
  });

  it('mostra una proposta automatica senza renderla ufficiale finche il Comitato non la conferma', async () => {
    render(
      <MemoryRouter>
        <RisultatiPage matches={matches} gameId="schedinone-2026" />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Proposta automatica/i)).toBeInTheDocument();
    expect(screen.getByText(/2-0/)).toBeInTheDocument();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Conferma proposta/i }));

    await waitFor(() => {
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        { path: 'games/schedinone-2026/matches/match-1' },
        {
          result: '1',
          score: '2-0',
          locked: true,
          resultSource: 'manual',
        }
      );
    });
    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith({
      path: 'games/schedinone-2026/resultProposals/match-1',
    });
    expect(recalcMocks.recalcPointsClient).toHaveBeenCalledWith('schedinone-2026');
  });

  it('permette al Comitato di cercare nuove proposte automatiche senza modificare i risultati ufficiali', async () => {
    render(
      <MemoryRouter>
        <RisultatiPage matches={matches} gameId="schedinone-2026" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cerca risultati automatici/i }));

    await waitFor(() => {
      expect(proposalMocks.fetchResultProposalsNow).toHaveBeenCalledWith('schedinone-2026');
    });
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });
});

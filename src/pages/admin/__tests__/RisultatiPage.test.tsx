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

function makeMatch(id: string, group: string, kickoff: string): Match {
  return {
    id,
    phase: 'gironi',
    group,
    homeTeam: `Casa ${group}`,
    awayTeam: `Trasferta ${group}`,
    kickoff: new Date(kickoff),
    kickoffSource: 'api',
    result: null,
    score: null,
    locked: false,
  };
}

const matches: Match[] = [
  makeMatch('match-3', 'C', '2026-06-13T22:00:00Z'),
  makeMatch('match-1', 'A', '2026-06-12T11:00:00Z'),
  makeMatch('match-2', 'B', '2026-06-12T10:00:00Z'),
];

function textContaining(value: string): HTMLElement {
  const element = screen.getAllByText((content) => content.includes(value))[0];
  if (!element) throw new Error(`Missing text containing ${value}`);
  return element;
}

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
            source: 'fifa-official',
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
    expect(screen.getByText(/12 giugno/i)).toBeInTheDocument();
    expect(
      textContaining('Casa B').compareDocumentPosition(textContaining('Casa A')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getAllByText(/Fonte FIFA ufficiale/i).length).toBeGreaterThan(0);
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

  it('gestisce i risultati Golden Plus solo con qualificata 1 o 2', async () => {
    const goldenMatch: Match = {
      id: 'r32-01',
      phase: 'sedicesimi',
      group: null,
      homeTeam: 'Italia',
      awayTeam: 'Brasile',
      kickoff: new Date('2026-06-28T19:00:00Z'),
      result: null,
      score: null,
      locked: false,
    };

    render(
      <MemoryRouter>
        <RisultatiPage
          matches={[goldenMatch]}
          gameId="schedinone-golden-plus-2026"
          predictionMode="qualifier"
          title="Risultati Golden"
          showAutomaticProposals={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /risultati golden/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerca risultati automatici/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /inserisci risultato/i }));

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'X' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: /salva risultato/i }));

    await waitFor(() => {
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        { path: 'games/schedinone-golden-plus-2026/matches/r32-01' },
        {
          result: '2',
          score: '',
          resultSource: 'manual',
        }
      );
    });
    expect(recalcMocks.recalcPointsClient).toHaveBeenCalledWith('schedinone-golden-plus-2026');
  });
});

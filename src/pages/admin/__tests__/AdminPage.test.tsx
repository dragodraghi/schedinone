import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../AdminPage';
import type { Game, Player, Thread } from '../../../lib/types';

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../components/QrCodeCard', () => ({
  default: () => <div>QR invito giocatori</div>,
}));

const chatMocks = vi.hoisted(() => ({
  subscribeAllThreads: vi.fn(),
}));

vi.mock('../../../lib/chat', () => chatMocks);

const game: Game = {
  id: 'schedinone-2026',
  name: 'Schedinone 2026',
  entryFee: 50,
  admins: ['admin-1'],
  accessCode: 'GIOCA2026',
  phases: ['gironi', 'ottavi', 'quarti', 'semifinali', 'finale'],
  currentPhase: 'gironi',
  topScorer: null,
  winner: null,
};

const pendingPlayer: Player = {
  id: 'player-1',
  name: 'Italia',
  joinedAt: new Date('2026-01-01T00:00:00Z'),
  predictions: {},
  topScorerPick: '',
  winnerPick: '',
  points: 0,
  paid: false,
  scheduleStatus: 'inviata',
};

const threadTime = { toDate: () => new Date('2026-01-01T00:00:00Z') } as Thread['lastMessageAt'];

describe('AdminPage', () => {
  beforeEach(() => {
    chatMocks.subscribeAllThreads.mockReset();
    chatMocks.subscribeAllThreads.mockImplementation(
      (_gameId: string, cb: (threads: (Thread & { id: string })[]) => void) => {
        cb([]);
        return vi.fn();
      }
    );
  });

  it('integra la messaggistica nel menu admin', () => {
    render(
      <MemoryRouter>
        <AdminPage game={game} players={[]} matches={[]} onLogout={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /messaggi/i })).toHaveAttribute('href', '/admin/messaggi');
  });

  it('non mostra il qr code nel pannello admin', () => {
    render(
      <MemoryRouter>
        <AdminPage game={game} players={[]} matches={[]} onLogout={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByText('QR invito giocatori')).not.toBeInTheDocument();
  });

  it('mette le urgenze operative in apertura del pannello admin', () => {
    render(
      <MemoryRouter>
        <AdminPage game={game} players={[pendingPlayer]} matches={[]} onLogout={vi.fn()} />
      </MemoryRouter>
    );

    const urgentPanel = screen.getByLabelText('Urgenze Comitato');

    expect(urgentPanel).toBeInTheDocument();
    expect(urgentPanel).toContainElement(screen.getByRole('link', { name: /Schedine da controllare/i }));
    expect(urgentPanel).toContainElement(screen.getByRole('link', { name: /Messaggi/i }));
    expect(urgentPanel).toContainElement(screen.getByRole('link', { name: /Annunci/i }));
    expect(within(urgentPanel).getByText('1')).toBeInTheDocument();
  });

  it('evidenzia nella dashboard admin i messaggi non letti del Comitato', async () => {
    chatMocks.subscribeAllThreads.mockImplementation(
      (_gameId: string, cb: (threads: (Thread & { id: string })[]) => void) => {
        cb([
          {
            id: 'player-1',
            playerUid: 'player-1',
            playerName: 'Italia',
            lastMessageAt: threadTime,
            lastMessagePreview: 'Serve aiuto',
            lastMessageFrom: 'player',
            unreadByPlayer: 0,
            unreadByCommittee: 2,
          },
          {
            id: 'player-2',
            playerUid: 'player-2',
            playerName: 'Brasile',
            lastMessageAt: threadTime,
            lastMessagePreview: 'Ok',
            lastMessageFrom: 'committee',
            unreadByPlayer: 0,
            unreadByCommittee: 1,
          },
        ]);
        return vi.fn();
      }
    );

    render(
      <MemoryRouter>
        <AdminPage game={game} players={[]} matches={[]} onLogout={vi.fn()} />
      </MemoryRouter>
    );

    const urgentPanel = screen.getByLabelText('Urgenze Comitato');
    const messagesLink = within(urgentPanel).getByRole('link', { name: /Messaggi/i });

    expect(await within(messagesLink).findByText('3')).toBeInTheDocument();
    expect(within(messagesLink).getByText(/messaggi da leggere/i)).toBeInTheDocument();
  });
});

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminPage from '../AdminPage';
import type { Game, Player } from '../../../lib/types';

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../components/QrCodeCard', () => ({
  default: () => <div>QR invito giocatori</div>,
}));

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

describe('AdminPage', () => {
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
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminMessaggiPage from '../AdminMessaggiPage';
import type { ChatMessage, Player, Thread } from '../../../lib/types';

const chatMocks = vi.hoisted(() => ({
  subscribeAllThreads: vi.fn(),
  subscribeMessages: vi.fn(),
  sendMessage: vi.fn(),
  sendBulkCommitteeMessage: vi.fn(),
  markThreadRead: vi.fn(),
  deleteChatMessage: vi.fn(),
}));

vi.mock('../../../lib/chat', () => chatMocks);

const ts = (iso: string) => ({
  toDate: () => new Date(iso),
}) as unknown as Timestamp;

const players: Player[] = [
  {
    id: 'alpha',
    name: 'Alpha FC',
    joinedAt: new Date('2026-01-01T10:00:00.000Z'),
    predictions: {},
    topScorerPick: '',
    winnerPick: '',
    points: 0,
    paid: false,
    scheduleStatus: 'bozza',
  },
  {
    id: 'beta',
    name: 'Beta FC',
    joinedAt: new Date('2026-01-02T10:00:00.000Z'),
    predictions: {},
    topScorerPick: '',
    winnerPick: '',
    points: 0,
    paid: false,
    scheduleStatus: 'bozza',
  },
  {
    id: 'gamma',
    name: 'Gamma FC',
    joinedAt: new Date('2026-01-03T10:00:00.000Z'),
    predictions: {},
    topScorerPick: '',
    winnerPick: '',
    points: 0,
    paid: false,
    scheduleStatus: 'bozza',
  },
];

const baseThreads: (Thread & { id: string })[] = [
  {
    id: 'alpha',
    playerUid: 'alpha',
    playerName: 'Alpha FC',
    lastMessageAt: ts('2026-06-02T12:00:00.000Z'),
    lastMessagePreview: 'Messaggio gia letto',
    lastMessageFrom: 'committee',
    unreadByPlayer: 0,
    unreadByCommittee: 0,
  },
  {
    id: 'beta',
    playerUid: 'beta',
    playerName: 'Beta FC',
    lastMessageAt: ts('2026-06-02T11:00:00.000Z'),
    lastMessagePreview: 'Serve controllo',
    lastMessageFrom: 'player',
    unreadByPlayer: 0,
    unreadByCommittee: 2,
  },
];

const baseMessages: ChatMessage[] = [
  {
    id: 'm1',
    text: 'Ciao Comitato',
    from: 'player',
    senderUid: 'beta',
    createdAt: ts('2026-06-02T11:00:00.000Z'),
  },
];

function renderPage() {
  return render(<AdminMessaggiPage gameId="world-cup-2026" currentUid="admin-1" players={players} />);
}

function configureChatMocks(
  threads: (Thread & { id: string })[] = baseThreads,
  messages: ChatMessage[] = baseMessages
) {
  chatMocks.subscribeAllThreads.mockImplementation((_gameId: string, cb: (items: (Thread & { id: string })[]) => void) => {
    cb(threads);
    return vi.fn();
  });
  chatMocks.subscribeMessages.mockImplementation((_gameId: string, _uid: string, cb: (items: ChatMessage[]) => void) => {
    cb(messages);
    return vi.fn();
  });
  chatMocks.markThreadRead.mockResolvedValue(undefined);
  chatMocks.sendMessage.mockResolvedValue(undefined);
  chatMocks.sendBulkCommitteeMessage.mockResolvedValue({ sent: players.length });
  chatMocks.deleteChatMessage.mockResolvedValue(undefined);
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  configureChatMocks();
});

describe('AdminMessaggiPage', () => {
  it('porta in cima le conversazioni non lette', async () => {
    renderPage();

    const beta = await screen.findByText('Beta FC');
    const alpha = screen.getByText('Alpha FC');

    expectBefore(beta, alpha);
  });

  it('filtra solo le conversazioni non lette', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /non lette/i }));

    expect(screen.getByText('Beta FC')).toBeInTheDocument();
    expect(screen.queryByText('Alpha FC')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma FC')).not.toBeInTheDocument();
  });

  it('cerca anche tra i giocatori senza conversazione', async () => {
    renderPage();

    fireEvent.change(await screen.findByPlaceholderText(/cerca squadra/i), { target: { value: 'gamma' } });

    expect(screen.getByText('Gamma FC')).toBeInTheDocument();
    expect(screen.queryByText('Alpha FC')).not.toBeInTheDocument();
  });

  it('inserisce una risposta rapida nel testo del messaggio', async () => {
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    fireEvent.click(screen.getByRole('button', { name: 'Pagamento ricevuto, grazie.' }));

    expect(screen.getByRole('textbox', { name: /testo del messaggio/i })).toHaveValue('Pagamento ricevuto, grazie.');
  });

  it('usa un layout messaggi gestibile anche da telefono', async () => {
    renderPage();

    expect(await screen.findByLabelText('Gestione messaggi privati')).toHaveClass('flex-col', 'lg:flex-row');
    fireEvent.click(screen.getByText('Beta FC'));
    expect(screen.getByTestId('committee-message-composer')).toHaveClass('flex-col', 'sm:flex-row');
  });

  it('blocca doppi invii mentre il messaggio e in corso', async () => {
    chatMocks.sendMessage.mockImplementation(() => new Promise(() => {}));
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    fireEvent.change(screen.getByRole('textbox', { name: /testo del messaggio/i }), { target: { value: 'Confermo tutto' } });

    const sendButton = screen.getByRole('button', { name: /^invia$/i });
    fireEvent.click(sendButton);

    await waitFor(() => expect(sendButton).toBeDisabled());
    fireEvent.click(sendButton);

    expect(chatMocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('invia un messaggio privato massivo a tutti i giocatori', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText(/testo massivo per tutti/i), {
      target: { value: 'Ricordatevi di controllare la schedina.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /invia a tutti/i }));

    await waitFor(() => {
      expect(chatMocks.sendBulkCommitteeMessage).toHaveBeenCalledWith(
        'world-cup-2026',
        'Ricordatevi di controllare la schedina.'
      );
    });
    expect(chatMocks.sendMessage).not.toHaveBeenCalled();
    expect(await screen.findByText(/messaggio inviato a 3 giocatori/i)).toBeInTheDocument();
  });

  it('mostra il messaggio massivo sopra la lista conversazioni', async () => {
    renderPage();

    const bulkLabel = await screen.findByText('Messaggio privato a tutti');
    const threadTitle = screen.getByText('Messaggi Comitato');

    expectBefore(bulkLabel, threadTitle);
  });

  it('mantiene il testo se l invio fallisce', async () => {
    chatMocks.sendMessage.mockRejectedValue(new Error('Permesso negato'));
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    fireEvent.change(screen.getByRole('textbox', { name: /testo del messaggio/i }), { target: { value: 'Messaggio da riprovare' } });
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }));

    expect(await screen.findByText(/permesso negato/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /testo del messaggio/i })).toHaveValue('Messaggio da riprovare');
  });

  it('segna letta la conversazione attiva quando arrivano non letti dal giocatore', async () => {
    let threadsCb: ((items: (Thread & { id: string })[]) => void) | null = null;
    chatMocks.subscribeAllThreads.mockImplementation((_gameId: string, cb: (items: (Thread & { id: string })[]) => void) => {
      threadsCb = cb;
      cb(baseThreads.map((thread) => ({ ...thread, unreadByCommittee: 0 })));
      return vi.fn();
    });

    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    chatMocks.markThreadRead.mockClear();
    act(() => {
      threadsCb?.(baseThreads);
    });

    await waitFor(() => {
      expect(chatMocks.markThreadRead).toHaveBeenCalledWith('world-cup-2026', 'beta');
    });
  });

  it('toglie subito il badge non letto quando il Comitato apre la conversazione', async () => {
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));

    await waitFor(() => {
      expect(screen.queryByText('Da leggere')).not.toBeInTheDocument();
      expect(screen.queryAllByText('2').filter((el) => el.tagName.toLowerCase() === 'span')).toHaveLength(0);
    });
  });

  it('mostra un errore se la conversazione non puo essere segnata come letta', async () => {
    chatMocks.markThreadRead.mockRejectedValue(new Error('Cloud Run ha respinto la chiamata'));
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));

    expect(await screen.findByText(/cloud run ha respinto la chiamata/i)).toBeInTheDocument();
  });

  it('cancella un singolo messaggio dopo conferma del Comitato', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    fireEvent.click(screen.getByRole('button', { name: /elimina messaggio/i }));

    await waitFor(() => {
      expect(chatMocks.deleteChatMessage).toHaveBeenCalledWith('world-cup-2026', 'beta', 'm1');
    });
    confirmSpy.mockRestore();
  });

  it('non cancella il messaggio se la conferma viene annullata', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    fireEvent.click(await screen.findByText('Beta FC'));
    fireEvent.click(screen.getByRole('button', { name: /elimina messaggio/i }));

    expect(chatMocks.deleteChatMessage).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

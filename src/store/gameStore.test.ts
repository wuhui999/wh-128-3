import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
  validatePlayCards,
  PlayCardsValidationResult,
} from '@/store/gameStore';
import { generateDeck } from '@/utils/cards';
import { CardState, GameState, GameStore, Rank } from '@/types/game';

function createTestCardState(cardId: string, played = false, inHand = false): CardState {
  const deck = generateDeck('2');
  const card = deck.find((c) => c.id === cardId) || deck[0];
  return { card, played, inHand };
}

function createTestCards(count: number, opts: { played?: boolean; inHand?: boolean } = {}): CardState[] {
  const deck = generateDeck('2');
  return deck.slice(0, count).map((card) => ({
    card,
    played: opts.played ?? false,
    inHand: opts.inHand ?? false,
  }));
}

function createTestStore() {
  function createTestInitialState(): GameState {
    const deck = generateDeck('2');
    const cards: CardState[] = deck.map((card) => ({
      card,
      played: false,
      inHand: false,
    }));
    return {
      initialized: true,
      levelCard: '2' as Rank,
      playerCount: 4,
      cards,
      operations: [],
      history: [],
      historyIndex: -1,
      createdAt: Date.now(),
    };
  }

  return create<GameStore>()((set, get) => ({
    ...createTestInitialState(),

    initGame: () => {},
    playCard: () => {},
    unplayCard: () => {},

    playCards: (cardIds: string[]) => {
      const state = get();
      const validation = validatePlayCards(cardIds, state.cards);
      if (!validation.success) {
        return validation;
      }

      set((state) => {
        const newCards = state.cards.map((c) => {
          if (cardIds.includes(c.card.id)) {
            return { ...c, played: true, inHand: false };
          }
          return c;
        });
        return { ...state, cards: newCards };
      });

      return { success: true };
    },

    undo: () => {},
    redo: () => {},
    resetGame: () => {},
    getRemainingCards: () => get().cards.filter((c) => !c.played && !c.inHand),
    getPlayedCards: () => get().cards.filter((c) => c.played),
    getHandCards: () => get().cards.filter((c) => c.inHand),
    getStats: () => ({
      totalCards: 0,
      totalPlayed: 0,
      totalRemaining: 0,
      totalInHand: 0,
      levelCard: '2' as Rank,
      jokers: { small: { total: 0, played: 0, remaining: 0 }, big: { total: 0, played: 0, remaining: 0 } },
      levelCards: { total: 0, played: 0, remaining: 0 },
      suits: [],
      ranks: [],
      bombPossibilities: [],
      keyCardsRemaining: [],
    }),
    exportGame: () => '',
    loadGame: () => {},
  }));
}

describe('validatePlayCards 纯函数校验', () => {
  describe('重复出牌校验', () => {
    it('所有牌未出时返回成功', () => {
      const cards = createTestCards(5);
      const cardIds = cards.map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(true);
    });

    it('单张已出牌应返回失败', () => {
      const cards = createTestCards(5);
      cards[2].played = true;
      const cardIds = cards.map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(false);
      expect(result.error).toContain('1张已出牌');
    });

    it('多张已出牌应返回失败', () => {
      const cards = createTestCards(10);
      cards[1].played = true;
      cards[3].played = true;
      cards[5].played = true;
      const cardIds = cards.slice(0, 6).map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(false);
      expect(result.error).toContain('3张已出牌');
    });

    it('已出牌不在选择范围内时返回成功', () => {
      const cards = createTestCards(10);
      cards[0].played = true;
      const cardIds = cards.slice(1, 5).map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(true);
    });
  });

  describe('出牌数上限校验', () => {
    it('出牌数未超上限时返回成功', () => {
      const cards = createTestCards(10);
      cards[0].inHand = true;
      cards[1].inHand = true;
      const cardIds = cards.slice(2, 5).map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(true);
    });

    it('出牌数等于剩余可出数时返回成功', () => {
      const cards = createTestCards(10);
      cards[0].inHand = true;
      cards[1].inHand = true;
      cards[2].played = true;
      const cardIds = cards.slice(3, 10).map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(true);
    });

    it('出牌数超出上限时返回失败', () => {
      const cards = createTestCards(10);
      cards[0].inHand = true;
      cards[1].inHand = true;
      cards[2].inHand = true;
      cards[3].played = true;
      const nonHandNonPlayed = cards.filter((c) => !c.inHand && !c.played);
      const cardIds = [...nonHandNonPlayed.map((c) => c.card.id), cards[0].card.id];
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(false);
      expect(result.error).toContain('超出上限');
      expect(result.error).toContain('最多还能出6张');
    });

    it('无手牌且全部未出时，出牌数等于总数时成功', () => {
      const cards = createTestCards(5);
      const cardIds = cards.map((c) => c.card.id);
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(true);
    });

    it('所有牌都是手牌时，任何出牌都失败', () => {
      const cards = createTestCards(5, { inHand: true });
      const cardIds = [cards[0].card.id];
      const result = validatePlayCards(cardIds, cards);
      expect(result.success).toBe(false);
      expect(result.error).toContain('最多还能出0张');
    });
  });
});

describe('playCards store action 集成测试', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('重复标记已出的牌应返回 { success: false }', () => {
    const cards = store.getState().cards;
    cards[5].played = true;
    cards[6].played = true;

    const result = store.getState().playCards([cards[5].card.id, cards[6].card.id, cards[7].card.id]);
    expect(result.success).toBe(false);
    expect((result as PlayCardsValidationResult).error).toContain('2张已出牌');
  });

  it('出牌数超过上限时应拒绝', () => {
    const cards = store.getState().cards;
    const handCardIds = cards.slice(0, 27).map((c) => c.card.id);
    const playedCardIds = cards.slice(27, 50).map((c) => c.card.id);
    store.setState({
      cards: cards.map((c) => ({
        ...c,
        inHand: handCardIds.includes(c.card.id),
        played: playedCardIds.includes(c.card.id),
      })),
    });

    const remainingPlayable = store.getState().cards.filter((c) => !c.inHand && !c.played);
    const testCardIds = [...remainingPlayable.map((c) => c.card.id), cards[0].card.id];
    const result = store.getState().playCards(testCardIds);
    expect(result.success).toBe(false);
    expect((result as PlayCardsValidationResult).error).toContain('超出上限');
  });

  it('合法批量出牌后，对应牌的 played=true 且 inHand=false', () => {
    const cards = store.getState().cards;
    const testCardIds = cards.slice(10, 15).map((c) => c.card.id);

    cards[10].inHand = true;
    cards[11].inHand = true;
    store.setState({ cards });

    const result = store.getState().playCards(testCardIds);
    expect(result.success).toBe(true);

    const updatedCards = store.getState().cards;
    testCardIds.forEach((id) => {
      const card = updatedCards.find((c) => c.card.id === id);
      expect(card?.played).toBe(true);
      expect(card?.inHand).toBe(false);
    });

    const otherCards = updatedCards.filter((c) => !testCardIds.includes(c.card.id));
    otherCards.forEach((card) => {
      expect(card.played).toBe(false);
    });
  });

  it('批量出牌后，其他牌状态不变', () => {
    const cards = store.getState().cards;
    cards[0].played = true;
    cards[1].inHand = true;
    store.setState({ cards });

    const testCardIds = cards.slice(10, 13).map((c) => c.card.id);
    store.getState().playCards(testCardIds);

    const updatedCards = store.getState().cards;
    expect(updatedCards[0].played).toBe(true);
    expect(updatedCards[1].inHand).toBe(true);
    expect(updatedCards[1].played).toBe(false);
  });
});

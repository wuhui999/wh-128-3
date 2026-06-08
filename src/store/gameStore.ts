import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import {
  GameStore,
  GameState,
  Rank,
  Card,
  CardState,
  Operation,
} from '@/types/game';

export interface PlayCardsValidationResult {
  success: boolean;
  error?: string;
}

export function validatePlayCards(
  cardIds: string[],
  cards: CardState[]
): PlayCardsValidationResult {
  const playedCards = cardIds.filter((id) => {
    const cs = cards.find((c) => c.card.id === id);
    return cs?.played;
  });
  if (playedCards.length > 0) {
    return {
      success: false,
      error: `所选牌中有${playedCards.length}张已出牌，无法重复标记`,
    };
  }

  const totalPlayed = cards.filter((c) => c.played).length;
  const maxPlayable = cards.length - cards.filter((c) => c.inHand).length;
  if (totalPlayed + cardIds.length > maxPlayable) {
    return {
      success: false,
      error: `出牌数超出上限，最多还能出${maxPlayable - totalPlayed}张`,
    };
  }

  return { success: true };
}
import { generateDeck, generateId } from '@/utils/cards';
import { recognizePattern } from '@/utils/pattern';
import { calculateStats } from '@/utils/stats';

const STORAGE_KEY = 'guandan-memorizer-game';

const MAX_HISTORY = 50;

function createInitialState(): GameState {
  return {
    initialized: false,
    levelCard: '2',
    playerCount: 4,
    cards: [],
    operations: [],
    history: [],
    historyIndex: -1,
    createdAt: Date.now(),
  };
}

function saveToHistory(state: GameState): GameState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  const stateCopy = JSON.parse(JSON.stringify({
    cards: state.cards,
    operations: state.operations,
    levelCard: state.levelCard,
    playerCount: state.playerCount,
    initialized: state.initialized,
    createdAt: state.createdAt,
  }));
  newHistory.push(stateCopy);

  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}



export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      initGame: (levelCard: Rank, playerCount: 2 | 3 | 4, handCardIds: string[]) => {
        set((state) => {
          const deck = generateDeck(levelCard);
          const cards: CardState[] = deck.map((card) => ({
            card,
            played: false,
            inHand: handCardIds.includes(card.id),
          }));

          const operation: Operation = {
            id: generateId(),
            type: 'init',
            timestamp: Date.now(),
            description: `开局：级牌${levelCard}，${playerCount}人局，手牌${handCardIds.length}张`,
            cardIds: handCardIds,
          };

          const newState: GameState = {
            ...state,
            initialized: true,
            levelCard,
            playerCount,
            cards,
            operations: [operation],
            history: [],
            historyIndex: -1,
            createdAt: Date.now(),
          };

          return saveToHistory(newState);
        });
      },

      playCard: (cardId: string) => {
        const state = get();
        const cardState = state.cards.find((c) => c.card.id === cardId);
        if (!cardState || cardState.played) return;
        const totalPlayed = state.cards.filter((c) => c.played).length;
        if (totalPlayed >= state.cards.length) return;

        set((state) => {
          const newState = produce(state, (draft) => {
            const card = draft.cards.find((c) => c.card.id === cardId);
            if (card) {
              card.played = true;
              card.inHand = false;

              const operation: Operation = {
                id: generateId(),
                type: 'play',
                timestamp: Date.now(),
                description: `出牌：${card.card.display}`,
                cardIds: [cardId],
              };
              draft.operations.push(operation);
            }
          });
          return saveToHistory(newState);
        });
      },

      unplayCard: (cardId: string) => {
        const state = get();
        const cardState = state.cards.find((c) => c.card.id === cardId);
        if (!cardState || !cardState.played) return;

        set((state) => {
          const newState = produce(state, (draft) => {
            const card = draft.cards.find((c) => c.card.id === cardId);
            if (card) {
              card.played = false;

              const operation: Operation = {
                id: generateId(),
                type: 'unplay',
                timestamp: Date.now(),
                description: `撤销出牌：${card.card.display}`,
                cardIds: [cardId],
              };
              draft.operations.push(operation);
            }
          });
          return saveToHistory(newState);
        });
      },

      playCards: (cardIds: string[]) => {
        const state = get();

        const validation = validatePlayCards(cardIds, state.cards);
        if (!validation.success) {
          return validation;
        }

        const cards = cardIds
          .map((id) => state.cards.find((c) => c.card.id === id)?.card)
          .filter(Boolean) as Card[];

        const pattern = recognizePattern(cards, state.levelCard);
        const cardDisplay = cards.slice(0, 3).map((c) => c.display).join('、');
        const moreText = cards.length > 3 ? `等${cards.length}张` : '';

        set((state) => {
          const newState = produce(state, (draft) => {
            cardIds.forEach((cardId) => {
              const card = draft.cards.find((c) => c.card.id === cardId);
              if (card) {
                card.played = true;
                card.inHand = false;
              }
            });

            const operation: Operation = {
              id: generateId(),
              type: 'playBatch',
              timestamp: Date.now(),
              description: `批量出牌：${cardDisplay}${moreText}（${pattern.name}）`,
              cardIds,
              pattern,
            };
            draft.operations.push(operation);
          });
          return saveToHistory(newState);
        });

        return { success: true };
      },

      undo: (steps: number = 1) => {
        set((state) => {
          if (state.historyIndex <= 0) return state;
          const newIndex = Math.max(0, state.historyIndex - steps);
          const historyState = state.history[newIndex];
          return {
            ...state,
            cards: historyState.cards,
            operations: historyState.operations,
            levelCard: historyState.levelCard,
            playerCount: historyState.playerCount,
            initialized: historyState.initialized,
            createdAt: historyState.createdAt,
            historyIndex: newIndex,
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;
          const newIndex = state.historyIndex + 1;
          const historyState = state.history[newIndex];
          return {
            ...state,
            cards: historyState.cards,
            operations: historyState.operations,
            levelCard: historyState.levelCard,
            playerCount: historyState.playerCount,
            initialized: historyState.initialized,
            createdAt: historyState.createdAt,
            historyIndex: newIndex,
          };
        });
      },

      resetGame: () => {
        set(createInitialState());
      },

      getRemainingCards: () => {
        return get().cards.filter((c) => !c.played && !c.inHand);
      },

      getPlayedCards: () => {
        return get().cards.filter((c) => c.played);
      },

      getHandCards: () => {
        return get().cards.filter((c) => c.inHand);
      },

      getStats: () => {
        return calculateStats(get());
      },

      exportGame: () => {
        const state = get();
        const exportData = {
          version: '1.0',
          exportedAt: Date.now(),
          game: {
            levelCard: state.levelCard,
            playerCount: state.playerCount,
            createdAt: state.createdAt,
            cards: state.cards.map((c) => ({
              id: c.card.id,
              suit: c.card.suit,
              rank: c.card.rank,
              played: c.played,
              inHand: c.inHand,
            })),
            operations: state.operations,
          },
          stats: calculateStats(state),
        };
        return JSON.stringify(exportData, null, 2);
      },

      loadGame: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.game || !parsed.game.cards) {
            throw new Error('无效的对局数据');
          }

          const deck = generateDeck(parsed.game.levelCard);
          const cards: CardState[] = parsed.game.cards.map((c: any) => {
            const card = deck.find((d) => d.id === c.id);
            if (!card) {
              throw new Error(`找不到牌：${c.id}`);
            }
            return {
              card,
              played: c.played,
              inHand: c.inHand,
            };
          });

          set((state) => ({
            ...state,
            initialized: true,
            levelCard: parsed.game.levelCard,
            playerCount: parsed.game.playerCount,
            cards,
            operations: parsed.game.operations || [],
            history: [],
            historyIndex: -1,
            createdAt: parsed.game.createdAt || Date.now(),
          }));
        } catch (e) {
          console.error('加载对局失败:', e);
          throw e;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        initialized: state.initialized,
        levelCard: state.levelCard,
        playerCount: state.playerCount,
        cards: state.cards,
        operations: state.operations,
        history: state.history,
        historyIndex: state.historyIndex,
        createdAt: state.createdAt,
      }),
    }
  )
);

import { Card, CardState, Suit, Rank, SUITS, RANKS, RANK_DISPLAY, SUIT_DISPLAY } from '@/types/game';

export function generateDeck(levelCard: Rank): Card[] {
  const cards: Card[] = [];
  let id = 0;

  for (let deck = 0; deck < 2; deck++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const isLevel = rank === levelCard;
        cards.push({
          id: `card-${id++}`,
          suit,
          rank,
          type: isLevel ? 'level' : 'normal',
          isJoker: false,
          display: `${SUIT_DISPLAY[suit]}${RANK_DISPLAY[rank]}`,
        });
      }
    }

    cards.push({
      id: `card-${id++}`,
      suit: 'joker',
      rank: 'small',
      type: 'joker',
      isJoker: true,
      display: '小王',
    });

    cards.push({
      id: `card-${id++}`,
      suit: 'joker',
      rank: 'big',
      type: 'joker',
      isJoker: true,
      display: '大王',
    });
  }

  return cards;
}

export function getCardDisplay(card: Card): string {
  if (card.isJoker) {
    return card.rank === 'big' ? '大王' : '小王';
  }
  return `${SUIT_DISPLAY[card.suit as Suit]}${RANK_DISPLAY[card.rank as Rank]}`;
}

export function getCardColorClass(card: Card): string {
  if (card.isJoker) {
    return card.rank === 'big' ? 'text-red-600' : 'text-gray-900';
  }
  if (card.suit === 'heart' || card.suit === 'diamond') {
    return 'text-red-600';
  }
  return 'text-gray-900';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const RANK_ORDER: Record<string, number> = {};
RANKS.forEach((r, i) => (RANK_ORDER[r] = i));

const SUIT_ORDER: Record<string, number> = {};
SUITS.forEach((s, i) => (SUIT_ORDER[s] = i));

export function compareCards(a: Card, b: Card): number {
  if (a.isJoker && b.isJoker) {
    return a.rank === 'big' ? 1 : -1;
  }
  if (a.isJoker) return 1;
  if (b.isJoker) return -1;

  const rankDiff = RANK_ORDER[a.rank as string] - RANK_ORDER[b.rank as string];
  if (rankDiff !== 0) return rankDiff;
  return SUIT_ORDER[a.suit as string] - SUIT_ORDER[b.suit as string];
}

export function compareCardStates(a: CardState, b: CardState): number {
  return compareCards(a.card, b.card);
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

export function sortCardStates(states: CardState[]): CardState[] {
  return [...states].sort(compareCardStates);
}

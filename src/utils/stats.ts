import {
  GameState,
  GameStats,
  SuitStats,
  RankStats,
  BombPossibility,
  SUITS,
  RANKS,
} from '@/types/game';

function calculateJokerStats(state: GameState) {
  const jokers = {
    small: { total: 0, played: 0, remaining: 0 },
    big: { total: 0, played: 0, remaining: 0 },
  };

  state.cards.forEach((c) => {
    if (c.card.isJoker) {
      const type = c.card.rank as 'small' | 'big';
      jokers[type].total++;
      if (c.played) jokers[type].played++;
      else if (!c.inHand) jokers[type].remaining++;
    }
  });

  return jokers;
}

function calculateLevelCardStats(state: GameState) {
  const levelCards = { total: 0, played: 0, remaining: 0 };
  state.cards.forEach((c) => {
    if (!c.card.isJoker && c.card.rank === state.levelCard) {
      levelCards.total++;
      if (c.played) levelCards.played++;
      else if (!c.inHand) levelCards.remaining++;
    }
  });
  return levelCards;
}

function calculateSuitStats(state: GameState): SuitStats[] {
  return SUITS.map((suit) => {
    const suitCards = state.cards.filter((c) => !c.card.isJoker && c.card.suit === suit);
    return {
      suit,
      total: suitCards.length,
      played: suitCards.filter((c) => c.played).length,
      remaining: suitCards.filter((c) => !c.played && !c.inHand).length,
    };
  });
}

function calculateRankStats(state: GameState, jokers: ReturnType<typeof calculateJokerStats>): RankStats[] {
  const ranks: RankStats[] = [];
  const { levelCard } = state;

  RANKS.forEach((rank) => {
    const rankCards = state.cards.filter((c) => !c.card.isJoker && c.card.rank === rank);
    ranks.push({
      rank,
      total: rankCards.length,
      played: rankCards.filter((c) => c.played).length,
      remaining: rankCards.filter((c) => !c.played && !c.inHand).length,
      isLevel: rank === levelCard,
      isJoker: false,
    });
  });

  ranks.push({
    rank: 'small',
    total: jokers.small.total,
    played: jokers.small.played,
    remaining: jokers.small.remaining,
    isLevel: false,
    isJoker: true,
  });

  ranks.push({
    rank: 'big',
    total: jokers.big.total,
    played: jokers.big.played,
    remaining: jokers.big.remaining,
    isLevel: false,
    isJoker: true,
  });

  return ranks;
}

function calculateBombPossibilities(
  state: GameState,
  ranks: RankStats[],
  jokers: ReturnType<typeof calculateJokerStats>
): BombPossibility[] {
  const bombPossibilities: BombPossibility[] = [];
  const { levelCard } = state;

  const jokerRemaining = jokers.small.remaining + jokers.big.remaining;
  if (jokerRemaining >= 2) {
    bombPossibilities.push({
      rank: 'joker',
      remaining: jokerRemaining,
      required: 2,
      probability: jokerRemaining >= 4 ? 'high' : jokerRemaining >= 3 ? 'medium' : 'low',
      description: `王炸剩余${jokerRemaining}张${jokerRemaining >= 4 ? '，天王炸可能' : jokerRemaining >= 3 ? '，三王可能' : ''}`,
    });
  }

  RANKS.forEach((rank) => {
    const rankStat = ranks.find((r) => r.rank === rank)!;
    if (rankStat.remaining >= 4) {
      bombPossibilities.push({
        rank,
        remaining: rankStat.remaining,
        required: 4,
        probability: rankStat.remaining >= 6 ? 'high' : rankStat.remaining >= 5 ? 'medium' : 'low',
        description: `${rank === levelCard ? '级牌' : ''}${rank}剩余${rankStat.remaining}张${rankStat.remaining >= 6 ? '，六张炸可能' : rankStat.remaining >= 5 ? '，五张炸可能' : '，四张炸可能'}`,
      });
    }
  });

  return bombPossibilities;
}

export function calculateStats(state: GameState): GameStats {
  const { cards, levelCard } = state;

  const totalCards = cards.length;
  const totalPlayed = cards.filter((c) => c.played).length;
  const totalRemaining = cards.filter((c) => !c.played && !c.inHand).length;
  const totalInHand = cards.filter((c) => c.inHand).length;

  const jokers = calculateJokerStats(state);
  const levelCards = calculateLevelCardStats(state);
  const suits = calculateSuitStats(state);
  const ranks = calculateRankStats(state, jokers);
  const bombPossibilities = calculateBombPossibilities(state, ranks, jokers);

  const keyCardsRemaining = cards.filter((c) => !c.played && !c.inHand && (c.card.isJoker || c.card.rank === levelCard));

  return {
    totalCards,
    totalPlayed,
    totalRemaining,
    totalInHand,
    levelCard,
    jokers,
    levelCards,
    suits,
    ranks,
    bombPossibilities,
    keyCardsRemaining,
  };
}

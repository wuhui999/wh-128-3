import { describe, it, expect } from 'vitest';
import { recognizePattern } from '@/utils/pattern';
import { Card, Rank, Suit } from '@/types/game';

let cardIdCounter = 0;

function createCard(rank: Rank | 'small' | 'big', suit: Suit | 'joker', isJoker = false): Card {
  const id = `test-card-${cardIdCounter++}`;
  const type = isJoker ? 'joker' : rank === '2' ? 'level' : 'normal';
  let display = '';
  if (isJoker) {
    display = rank === 'big' ? '大王' : '小王';
  } else {
    const suitDisplay: Record<Suit, string> = {
      spade: '♠',
      heart: '♥',
      club: '♣',
      diamond: '♦',
    };
    display = `${suitDisplay[suit as Suit]}${rank}`;
  }
  return { id, suit, rank, type, isJoker, display };
}

describe('recognizePattern 牌型识别', () => {
  const levelCard: Rank = '2';

  describe('基础牌型', () => {
    it('空数组返回未知牌型', () => {
      const result = recognizePattern([], levelCard);
      expect(result.type).toBe('unknown');
      expect(result.name).toBe('未知');
    });

    it('单张牌识别为单张', () => {
      const cards = [createCard('A', 'spade')];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('single');
      expect(result.name).toBe('单张');
      expect(result.description).toContain('♠A');
    });

    it('单张小王识别为单张', () => {
      const cards = [createCard('small', 'joker', true)];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('single');
      expect(result.name).toBe('单张');
      expect(result.description).toContain('小王');
    });

    it('两张相同点数识别为对子', () => {
      const cards = [createCard('K', 'spade'), createCard('K', 'heart')];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('pair');
      expect(result.name).toBe('对子');
      expect(result.description).toContain('K');
    });

    it('三张相同点数识别为三张', () => {
      const cards = [
        createCard('Q', 'spade'),
        createCard('Q', 'heart'),
        createCard('Q', 'club'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('triple');
      expect(result.name).toBe('三张');
      expect(result.description).toContain('Q');
    });

    it('三张+一对识别为三带二', () => {
      const cards = [
        createCard('J', 'spade'),
        createCard('J', 'heart'),
        createCard('J', 'club'),
        createCard('5', 'spade'),
        createCard('5', 'heart'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('tripleWithPair');
      expect(result.name).toBe('三带二');
      expect(result.description).toContain('J三张带5一对');
    });
  });

  describe('炸弹牌型', () => {
    it('四张相同点数识别为炸弹', () => {
      const cards = [
        createCard('10', 'spade'),
        createCard('10', 'heart'),
        createCard('10', 'club'),
        createCard('10', 'diamond'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('bomb');
      expect(result.name).toBe('炸弹');
      expect(result.description).toContain('4张10');
    });

    it('五张相同点数识别为炸弹', () => {
      const cards = [
        createCard('7', 'spade'),
        createCard('7', 'heart'),
        createCard('7', 'club'),
        createCard('7', 'diamond'),
        createCard('7', 'spade'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('bomb');
      expect(result.name).toBe('炸弹');
      expect(result.description).toContain('5张7');
    });

    it('四张级牌识别为级牌炸弹', () => {
      const cards = [
        createCard('2', 'spade'),
        createCard('2', 'heart'),
        createCard('2', 'club'),
        createCard('2', 'diamond'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('bomb');
      expect(result.name).toBe('级牌炸弹');
      expect(result.description).toContain('级牌炸');
    });

    it('六张级牌识别为级牌炸弹', () => {
      const cards = [
        createCard('2', 'spade'),
        createCard('2', 'heart'),
        createCard('2', 'club'),
        createCard('2', 'diamond'),
        createCard('2', 'spade'),
        createCard('2', 'heart'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('bomb');
      expect(result.name).toBe('级牌炸弹');
      expect(result.description).toContain('6张2');
    });
  });

  describe('顺子/同花/同花顺', () => {
    it('五张连续点数识别为顺子', () => {
      const cards = [
        createCard('3', 'spade'),
        createCard('4', 'heart'),
        createCard('5', 'club'),
        createCard('6', 'diamond'),
        createCard('7', 'spade'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('straight');
      expect(result.name).toBe('顺子');
      expect(result.description).toContain('3-7顺子');
    });

    it('六张连续点数识别为顺子', () => {
      const cards = [
        createCard('5', 'spade'),
        createCard('6', 'heart'),
        createCard('7', 'club'),
        createCard('8', 'diamond'),
        createCard('9', 'spade'),
        createCard('10', 'heart'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('straight');
      expect(result.name).toBe('顺子');
      expect(result.description).toContain('5-10顺子');
    });

    it('五张同花色不同点数识别为同花', () => {
      const cards = [
        createCard('3', 'spade'),
        createCard('5', 'spade'),
        createCard('7', 'spade'),
        createCard('9', 'spade'),
        createCard('J', 'spade'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('flush');
      expect(result.name).toBe('同花');
      expect(result.description).toContain('5张同花');
    });

    it('五张连续同花色识别为同花顺', () => {
      const cards = [
        createCard('3', 'heart'),
        createCard('4', 'heart'),
        createCard('5', 'heart'),
        createCard('6', 'heart'),
        createCard('7', 'heart'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('straightFlush');
      expect(result.name).toBe('同花顺');
      expect(result.description).toContain('3-7同花顺');
    });

    it('四张连续不识别为顺子（不足5张）', () => {
      const cards = [
        createCard('3', 'spade'),
        createCard('4', 'heart'),
        createCard('5', 'club'),
        createCard('6', 'diamond'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).not.toBe('straight');
    });

    it('五张不连续不识别为顺子', () => {
      const cards = [
        createCard('3', 'spade'),
        createCard('4', 'heart'),
        createCard('5', 'club'),
        createCard('6', 'diamond'),
        createCard('8', 'spade'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).not.toBe('straight');
    });
  });

  describe('王牌牌型', () => {
    it('两张王牌识别为王炸', () => {
      const cards = [createCard('small', 'joker', true), createCard('big', 'joker', true)];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('jokerBomb');
      expect(result.name).toBe('王炸');
      expect(result.description).toContain('2张王牌炸');
    });

    it('三张王牌识别为王炸', () => {
      const cards = [
        createCard('small', 'joker', true),
        createCard('small', 'joker', true),
        createCard('big', 'joker', true),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('jokerBomb');
      expect(result.name).toBe('王炸');
      expect(result.description).toContain('3张王牌炸');
    });

    it('四张王牌识别为天王炸', () => {
      const cards = [
        createCard('small', 'joker', true),
        createCard('small', 'joker', true),
        createCard('big', 'joker', true),
        createCard('big', 'joker', true),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('jokerBomb');
      expect(result.name).toBe('天王炸');
      expect(result.description).toContain('4张王牌炸');
    });

    it('王牌+普通牌混合识别为未知牌型', () => {
      const cards = [createCard('small', 'joker', true), createCard('A', 'spade')];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('unknown');
      expect(result.name).toBe('未知牌型');
      expect(result.description).toContain('+1王');
    });

    it('两张王牌+一张普通牌识别为未知牌型', () => {
      const cards = [
        createCard('small', 'joker', true),
        createCard('big', 'joker', true),
        createCard('K', 'heart'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('unknown');
      expect(result.name).toBe('未知牌型');
      expect(result.description).toContain('+2王');
    });
  });

  describe('其他未知牌型', () => {
    it('两对识别为未知牌型', () => {
      const cards = [
        createCard('K', 'spade'),
        createCard('K', 'heart'),
        createCard('Q', 'club'),
        createCard('Q', 'diamond'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('unknown');
      expect(result.name).toBe('未知牌型');
    });

    it('三张三张识别为未知牌型', () => {
      const cards = [
        createCard('A', 'spade'),
        createCard('A', 'heart'),
        createCard('A', 'club'),
        createCard('K', 'spade'),
        createCard('K', 'heart'),
        createCard('K', 'club'),
      ];
      const result = recognizePattern(cards, levelCard);
      expect(result.type).toBe('unknown');
    });
  });
});

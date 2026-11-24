import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "./AuthContext";
import { ACTIVE_CARD_KEY, Card, listCards } from "../services/cardsService";

/**
 * Which of the user's cards the app is working on. The id is stored in
 * AsyncStorage and sent as `X-Card-Id` by the API client (services/api.ts).
 * `cardVersion` bumps whenever the active card changes so screens can refetch.
 */
type CardContextType = {
  cards: Card[];
  activeCard: Card | null;
  cardVersion: number;
  setActiveCard: (id: string) => Promise<void>;
  refreshCards: () => Promise<Card[]>;
};

const CardContext = createContext<CardContextType>({
  cards: [],
  activeCard: null,
  cardVersion: 0,
  setActiveCard: async () => {},
  refreshCards: async () => [],
});

export function CardProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardVersion, setCardVersion] = useState(0);

  const refreshCards = useCallback(async () => {
    try {
      const list = await listCards();
      setCards(list);
      const stored = await AsyncStorage.getItem(ACTIVE_CARD_KEY);
      const valid = list.find((c) => c.id === stored) ?? list.find((c) => c.is_primary) ?? list[0];
      if (valid && valid.id !== stored) {
        await AsyncStorage.setItem(ACTIVE_CARD_KEY, valid.id);
      }
      setActiveId((prev) => {
        if (prev !== (valid?.id ?? null)) setCardVersion((v) => v + 1);
        return valid?.id ?? null;
      });
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshCards();
    } else {
      setCards([]);
      setActiveId(null);
      AsyncStorage.removeItem(ACTIVE_CARD_KEY);
    }
  }, [token, refreshCards]);

  const setActiveCard = useCallback(async (id: string) => {
    await AsyncStorage.setItem(ACTIVE_CARD_KEY, id);
    setActiveId(id);
    setCardVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({
      cards,
      activeCard: cards.find((c) => c.id === activeId) ?? null,
      cardVersion,
      setActiveCard,
      refreshCards,
    }),
    [cards, activeId, cardVersion, setActiveCard, refreshCards]
  );

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export const useCards = () => useContext(CardContext);

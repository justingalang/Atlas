/**
 * Home screen renders a live, auto-saving carousel of today's encounters.
 * Cards save through firestorePeople helpers with a short debounce—no save button needed.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createEncounter,
  getEncountersByDateRange,
  upsertPersonByName,
  updateEncounter,
} from './services/firestorePeople';
import {auth, isFirebaseConfigured} from './firebase';

const AUTOSAVE_DELAY = 700;

const formatToday = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const hasLastName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2;
};

const buildDisplayName = (name = '', memo = '') => {
  const trimmedName = name.trim();
  const trimmedMemo = memo.trim();
  if (trimmedMemo && (!trimmedName || !hasLastName(trimmedName))) {
    return trimmedName ? `${trimmedName} - ${trimmedMemo}` : trimmedMemo;
  }
  return trimmedName;
};

const normalizeFactsForState = (facts = []) => {
  const prepared = (Array.isArray(facts) ? facts : []).map((fact) => ({
    text: String(fact?.text ?? ''),
  }));
  const compacted = prepared.filter(
    (fact, index) => fact.text.trim().length > 0 || index === prepared.length - 1,
  );
  const ensured = compacted.length > 0 ? compacted : [{text: ''}];
  const last = ensured[ensured.length - 1];
  if (last.text.trim()) {
    ensured.push({text: ''});
  }
  return ensured;
};

const buildFactsPayload = (facts = []) =>
  (Array.isArray(facts) ? facts : [])
    .map((fact, index) => ({
      orderIndex: index,
      text: String(fact?.text ?? '').trim(),
    }))
    .filter((fact) => fact.text.length > 0);

const hasMeaningfulContent = (card) => {
  if (!card) return false;
  return Boolean(
    (card.personName || '').trim() ||
      (card.memo || '').trim() ||
      (card.placeLabel || '').trim() ||
      buildFactsPayload(card.facts).length > 0,
  );
};

const generateClientId = (prefix = 'local') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createBlankCard = () => ({
  clientId: generateClientId('local'),
  encounterId: null,
  personId: null,
  personName: '',
  memo: '',
  placeLabel: '',
  facts: normalizeFactsForState(),
  isNew: true,
  needsSave: false,
  date: new Date(),
});

const ensureTrailingBlankCard = (cards = []) => {
  const list = (cards || []).filter(Boolean);
  const trimmed = list.filter((card, index) => {
    const isLast = index === list.length - 1;
    const isBlank = !hasMeaningfulContent(card) && !card.encounterId && !card.personId;
    return !isBlank || isLast;
  });
  const last = trimmed[trimmed.length - 1];
  if (!last || hasMeaningfulContent(last) || last.encounterId) {
    trimmed.push(createBlankCard());
  }
  return trimmed.map((card) => ({
    ...card,
    clientId: card.clientId || generateClientId('card'),
    facts: normalizeFactsForState(card.facts),
  }));
};

const normalizeCard = (card) => ({
  ...card,
  facts: normalizeFactsForState(card.facts),
});

const focusNextFact = (factRefs, cardId, index) => {
  const nextRef = factRefs.current?.[cardId]?.[index];
  if (nextRef?.focus) {
    nextRef.focus();
    return;
  }
  // If the next ref isn't mounted yet (e.g., just added a blank fact), try again shortly.
  setTimeout(() => {
    const retryRef = factRefs.current?.[cardId]?.[index];
    retryRef?.focus?.();
  }, 80);
};

const mapEncounterToCard = (encounter) => {
  const orderedFacts = [...(encounter?.facts || [])].sort(
    (a, b) => (a?.orderIndex ?? 0) - (b?.orderIndex ?? 0),
  );
  return {
    clientId: encounter?.id ? String(encounter.id) : generateClientId('enc'),
    encounterId: encounter.id,
    personId: encounter.personId,
    personName: encounter.personName || '',
    memo: '',
    placeLabel: encounter.placeLabel || '',
    facts: normalizeFactsForState(orderedFacts),
    isNew: false,
    needsSave: false,
    date: encounter.date?.toDate ? encounter.date.toDate() : new Date(),
  };
};

const scrollIntoView = (scrollRefs, cardId, y = 0) => {
  const ref = scrollRefs.current?.[cardId];
  if (ref?.scrollTo) {
    ref.scrollTo({y, animated: true});
  }
};

export default function Home() {
  const [cards, setCards] = useState([createBlankCard()]);
  const [saveStatus, setSaveStatus] = useState({});
  const timersRef = useRef(new Map());
  const cardsRef = useRef(cards);
  const nameRef = useRef(null);
  const memoRef = useRef(null);
  const placeRef = useRef(null);
  const factRefs = useRef({});
  const cardScrollRefs = useRef({});
  const today = useMemo(formatToday, []);
  const userId = useMemo(() => auth?.currentUser?.uid || 'demo-user', []);
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const cardWidth = screenWidth - 56;
  const cardHeight = Math.max(420, screenHeight - 220);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const shouldPersistCard = useCallback((card) => {
    if (!card) return false;
    const displayName = buildDisplayName(card.personName, card.memo);
    const factsPayload = buildFactsPayload(card.facts);
    const place = (card.placeLabel || '').trim();
    return Boolean(displayName && (factsPayload.length > 0 || place));
  }, []);

  const loadTodayEncounters = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setCards([createBlankCard()]);
      return;
    }
    try {
      const encounters = await getEncountersByDateRange(userId, startOfToday(), endOfToday());
      setCards(ensureTrailingBlankCard(encounters.map(mapEncounterToCard)));
    } catch (error) {
      console.warn('Unable to load today encounters:', error);
      setCards(ensureTrailingBlankCard([]));
    }
  }, [userId]);

  useEffect(() => {
    loadTodayEncounters();
  }, [loadTodayEncounters]);

  const persistCard = useCallback(
    async (clientId) => {
      const latestCard = cardsRef.current.find((card) => card.clientId === clientId);
      if (!latestCard || !shouldPersistCard(latestCard) || !isFirebaseConfigured) {
        timersRef.current.delete(clientId);
        return;
      }

      const displayName = buildDisplayName(latestCard.personName, latestCard.memo);
      const factsPayload = buildFactsPayload(latestCard.facts);
      const place = (latestCard.placeLabel || '').trim();

      setSaveStatus((prev) => ({...prev, [clientId]: 'saving'}));

      try {
        const person = await upsertPersonByName(
          userId,
          displayName,
          latestCard.memo.trim() ? {memo: latestCard.memo.trim()} : {},
        );

        const encounterPayload = {
          personId: person.id,
          personName: person.displayName,
          date: latestCard.date || new Date(),
          placeLabel: place || 'Unspecified place',
          facts: factsPayload,
        };

        if (latestCard.encounterId) {
          await updateEncounter(userId, latestCard.encounterId, encounterPayload);
          setCards((prev) => {
            const idx = prev.findIndex((c) => c.clientId === clientId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              personId: encounterPayload.personId,
              isNew: false,
              needsSave: false,
            };
            return ensureTrailingBlankCard(next);
          });
        } else {
          const created = await createEncounter(userId, encounterPayload);
          setCards((prev) => {
            const idx = prev.findIndex((c) => c.clientId === clientId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              encounterId: created.id,
              personId: created.personId,
              isNew: false,
              needsSave: false,
            };
            return ensureTrailingBlankCard(next);
          });
        }
        setSaveStatus((prev) => ({...prev, [clientId]: 'saved'}));
      } catch (error) {
        console.warn('Unable to auto-save encounter:', error);
        setSaveStatus((prev) => ({...prev, [clientId]: 'error'}));
      } finally {
        timersRef.current.delete(clientId);
      }
    },
    [userId, shouldPersistCard],
  );

  const queueSave = useCallback(
    (cardSnapshot, delay = AUTOSAVE_DELAY) => {
      if (!cardSnapshot) return;
      const key = cardSnapshot.clientId;
      const existingTimer = timersRef.current.get(key);

      if (!shouldPersistCard(cardSnapshot)) {
        if (existingTimer) {
          clearTimeout(existingTimer);
          timersRef.current.delete(key);
        }
        return;
      }

      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const timeoutId = setTimeout(() => persistCard(key), delay);
      timersRef.current.set(key, timeoutId);
    },
    [persistCard, shouldPersistCard],
  );

  const updateCardById = useCallback(
    (clientId, updater, immediateSave = false) => {
      let snapshot = null;
      setCards((prevCards) => {
        const idx = prevCards.findIndex((card) => card.clientId === clientId);
        if (idx === -1) return prevCards;

        const updatedCard = normalizeCard(updater(prevCards[idx]));
        snapshot = {...updatedCard, needsSave: true};

        const nextCards = [...prevCards];
        nextCards[idx] = snapshot;
        return ensureTrailingBlankCard(nextCards);
      });

      if (snapshot) {
        queueSave(snapshot, immediateSave ? 120 : AUTOSAVE_DELAY);
      }
    },
    [queueSave],
  );

  const handleFactChange = useCallback(
    (clientId, factIndex, text) => {
      updateCardById(clientId, (card) => {
        const facts = [...(card.facts || [])];
        facts[factIndex] = {...facts[factIndex], text};
        return {...card, facts};
      });
    },
    [updateCardById],
  );

  const handleRemoveFact = useCallback(
    (clientId, factIndex) => {
      updateCardById(clientId, (card) => {
        const facts = Array.isArray(card.facts) ? [...card.facts] : [];
        if (facts.length <= 1) {
          return {...card, facts: [{text: ''}]};
        }
        const pruned = facts.filter((_, index) => index !== factIndex);
        return {...card, facts: pruned};
      }, true);
    },
    [updateCardById],
  );

  const renderCard = useCallback(
    ({item: card}) => {
      const isAddCard = !hasMeaningfulContent(card) && !card.encounterId && !card.personId;
      const status = saveStatus[card.clientId];
      const statusLabel =
        status === 'saving'
          ? 'Saving…'
          : status === 'error'
          ? 'Check connection'
          : status === 'saved'
          ? 'Saved'
          : 'Auto-saves';
      return (
        <View style={[styles.card, isAddCard && styles.addCard, {width: cardWidth, height: cardHeight}]}>
          <ScrollView
            ref={(ref) => {
              if (!cardScrollRefs.current) {
                cardScrollRefs.current = {};
              }
              cardScrollRefs.current[card.clientId] = ref;
            }}
            style={styles.cardScroller}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{isAddCard ? 'Add person' : 'Encounter'}</Text>
              <View
                style={[
                  styles.statusPill,
                  status === 'saving' && styles.statusSaving,
                  status === 'error' && styles.statusError,
                ]}
              >
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>

            <TextInput
              value={card.personName}
              ref={nameRef}
            onChangeText={(text) =>
              updateCardById(card.clientId, (c) => ({...c, personName: text}))
            }
            placeholder="Who is this?"
            style={styles.input}
            placeholderTextColor="#6b7280"
            returnKeyType="next"
            blurOnSubmit
            onFocus={() => scrollIntoView(cardScrollRefs, card.clientId, 0)}
            onSubmitEditing={() => memoRef.current?.focus?.()}
            onEndEditing={() =>
              queueSave(cardsRef.current.find((c) => c.clientId === card.clientId), 150)
            }
          />
            <TextInput
              value={card.memo}
              ref={memoRef}
              onChangeText={(text) => updateCardById(card.clientId, (c) => ({...c, memo: text}))}
              placeholder="Memo / descriptor (optional)"
              style={styles.input}
              placeholderTextColor="#6b7280"
              returnKeyType="next"
              blurOnSubmit
              onFocus={() => scrollIntoView(cardScrollRefs, card.clientId, 60)}
              onSubmitEditing={() => placeRef.current?.focus?.()}
              onEndEditing={() =>
                queueSave(cardsRef.current.find((c) => c.clientId === card.clientId), 150)
              }
            />
            <TextInput
              value={card.placeLabel}
              ref={placeRef}
              onChangeText={(text) =>
                updateCardById(card.clientId, (c) => ({...c, placeLabel: text}))
              }
              placeholder="Where did this happen?"
              style={styles.input}
              placeholderTextColor="#6b7280"
              returnKeyType="next"
              blurOnSubmit
              onFocus={() => scrollIntoView(cardScrollRefs, card.clientId, 120)}
              onSubmitEditing={() => {
                const nextRef = factRefs.current?.[card.clientId]?.[0];
                nextRef?.focus?.();
              }}
              onEndEditing={() =>
                queueSave(cardsRef.current.find((c) => c.clientId === card.clientId), 150)
              }
            />

            <View style={styles.factsHeader}>
              <Text style={styles.sectionLabel}>What happened?</Text>
              <Pressable
                onPress={() =>
                  updateCardById(card.clientId, (c) => ({
                    ...c,
                    facts: normalizeFactsForState([...c.facts, {text: ''}]),
                  }))
                }
              >
                <Text style={styles.addFact}>+ Fact</Text>
              </Pressable>
            </View>

            {card.facts.map((fact, index) => (
              <View key={`${card.clientId}-fact-${index}`} style={styles.factRow}>
                <Text style={styles.factIndex}>{index + 1}</Text>
                <TextInput
                  value={fact.text}
                  ref={(ref) => {
                    if (!factRefs.current[card.clientId]) {
                      factRefs.current[card.clientId] = [];
                    }
                    factRefs.current[card.clientId][index] = ref;
                  }}
                  onChangeText={(text) => handleFactChange(card.clientId, index, text)}
                  placeholder="What stood out?"
                  style={styles.factInput}
                  placeholderTextColor="#6b7280"
                  multiline={false}
                  returnKeyType="next"
                  blurOnSubmit
                  onFocus={() => scrollIntoView(cardScrollRefs, card.clientId, 180 + index * 95)}
                  onSubmitEditing={() => {
                    const currentCard = cardsRef.current.find((c) => c.clientId === card.clientId);
                    const hasNext = currentCard?.facts && currentCard.facts[index + 1];
                    if (!hasNext) {
                      updateCardById(card.clientId, (c) => {
                        const facts = Array.isArray(c.facts) ? [...c.facts] : [];
                        if (index >= facts.length - 1) {
                          facts.push({text: ''});
                        }
                        return {...c, facts};
                      });
                    }
                    focusNextFact(factRefs, card.clientId, index + 1);
                  }}
                  onEndEditing={() =>
                    queueSave(cardsRef.current.find((c) => c.clientId === card.clientId), 150)
                  }
                />
                {card.facts.length > 1 && fact.text.trim().length === 0 ? (
                  <Pressable onPress={() => handleRemoveFact(card.clientId, index)}>
                    <Text style={styles.removeFact}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      );
    },
    [
      cardHeight,
      cardWidth,
      handleFactChange,
      handleRemoveFact,
      queueSave,
      saveStatus,
      updateCardById,
    ],
  );

  const keyExtractor = useCallback(
    (item, index) => item?.clientId || item?.encounterId || `card-${index}`,
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <View style={styles.inner}>
        <Text style={styles.date}>{today}</Text>
        <FlatList
          data={cards}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          ItemSeparatorComponent={() => <View style={{width: 16}} />}
          onScrollBeginDrag={Keyboard.dismiss}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1021'},
  inner: {flex: 1, paddingTop: 18},
  date: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e2e8f0',
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  carousel: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 10},
  },
  addCard: {
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: '#0f172a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  statusSaving: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  statusError: {
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#e5e7eb',
    backgroundColor: '#0b1224',
    marginBottom: 12,
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  sectionLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  addFact: {
    color: '#60a5fa',
    fontWeight: '700',
    fontSize: 14,
  },
  cardScroller: {flex: 1},
  cardContent: {paddingBottom: 260},
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0d1429',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  factIndex: {
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 8,
    width: 20,
    textAlign: 'center',
  },
  factInput: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 42,
  },
  removeFact: {
    color: '#f87171',
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

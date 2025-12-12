/**
 * Utilities for working with person identifiers and entries.
 * Functions are dependency-injected for easier testing.
 */
export const hasLastName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2;
};

const normalizePersonData = (personData = {}) => {
  const normalizedName = (personData.name ?? '').trim();
  const normalizedMemo = (personData.memo ?? '').trim();
  return {normalizedName, normalizedMemo};
};

const requireUniqueIdentifier = (
  normalizedName,
  normalizedMemo,
  logger = console,
) => {
  if (!normalizedMemo && (!normalizedName || !hasLastName(normalizedName))) {
    logger.warn('Provide either a memo or a full name with a last name.');
    return false;
  }
  return true;
};

const buildIdentifier = ({normalizedName, normalizedMemo}, logger = console) => {
  if (!requireUniqueIdentifier(normalizedName, normalizedMemo, logger)) {
    return null;
  }
  if (hasLastName(normalizedName)) {
    return normalizedName;
  }
  if (!normalizedMemo) {
    logger.error(
      'Person name must have at least a last name or a memo to be unique.',
    );
    return null;
  }
  return `${normalizedName}-${normalizedMemo}`;
};

export const createPersonHandlers = ({
  addDocument,
  addSubcollectionDocument,
  getDocumentsByField,
  now = () => new Date().toISOString(),
  logger = console,
} = {}) => {
  if (!addDocument || !addSubcollectionDocument) {
    throw new Error(
      'addDocument and addSubcollectionDocument are required dependencies.',
    );
  }

  /**
   * Normalizes the entry date to YYYY-MM-DD format.
   * @param {*} dateValue - The date value to normalize.
   * @returns {string} - Normalized entry date in YYYY-MM-DD format.
   */
  const normalizeEntryDate = (dateValue) => {
    const candidate = dateValue ?? now();
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
      return now().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
  };

  /**
   * Writes an entry for a specific date for a person.
   * @param {*} personId - The ID of the person.
   * @param {*} entryData - The entry data to be written.
   * @returns {Promise<{entryDate: string, entryId: string}>}
   */
  const writeEntryForDate = async (personId, entryData) => {
    const dataWithDate = {...entryData, date: entryData.date ?? now()};
    const entryDate = normalizeEntryDate(dataWithDate.date);
    let entryPayload = {...dataWithDate, entryDate};
    let existingEntryId;

    if (getDocumentsByField) {
      const entrySnapshot = await getDocumentsByField(
        `people/${personId}/entries`,
        'entryDate',
        entryDate,
      );

      if (!entrySnapshot?.empty) {
        const existingDoc = entrySnapshot.docs[0];
        existingEntryId = existingDoc.id;
        const existingData =
          typeof existingDoc.data === 'function'
            ? existingDoc.data()
            : existingDoc.data ?? {};
        entryPayload = {...existingData, ...entryPayload};
      }
    }

    await addSubcollectionDocument(
      'people',
      personId,
      'entries',
      entryPayload,
      existingEntryId ?? entryDate,
    );
    return {entryDate, entryId: existingEntryId ?? entryDate};
  };

  /**
   * Builds the entry data object.
   * @param {*} data 
   * @param {*} normalizedName 
   * @param {*} normalizedMemo 
   * @returns 
   */
  const buildEntryData = (data, normalizedName, normalizedMemo) => {
    const entryData = {...data};
    if (normalizedName) entryData.name = normalizedName;
    if (normalizedMemo) entryData.memo = normalizedMemo;
    if (hasLastName(normalizedName)) {
      entryData.memo = '';
    }
    return entryData;
  };

  /**
   * Ensures a person document exists and returns its ID.
   * @param {*} entryData - The entry data containing name and memo.
   * @returns {Promise<string>} - The person document ID.
   */
  const ensurePersonId = async (entryData) => {
    const existingPersonId = await getPersonId(entryData);
    if (existingPersonId) {
      await addDocument(
        'people',
        {name: entryData.name, memo: entryData.memo},
        existingPersonId,
      );
      return existingPersonId;
    }

    const personDoc = await addDocument('people', {
      name: entryData.name,
      memo: entryData.memo,
      firstImpressionInfo: {
        date: now(),
        where: entryData.place || 'unknown',
      }
    });
    const personId = personDoc?.id ?? personDoc;
    await savePersonId(entryData, personId);
    return personId;
  };

  /**
   * Saves the person identifier mapping.
   * @param {*} personData - The person data containing name and memo.
   * @param {*} id - The identifier to be saved.
   * @returns 
   */
  const savePersonId = async (personData, id) => {
    const {normalizedName, normalizedMemo} = normalizePersonData(personData);
    const identifier = buildIdentifier(
      {normalizedName, normalizedMemo},
      logger,
    );
    if (!identifier) return null;
    await addDocument('peopleIds', {identifier, id});
    return identifier;
  };

  /**
   * Retrieves the person document ID based on the identifier.
   * @param {*} personData - The person data containing name and memo.
   * @returns {Promise<string|null>} - The person document ID or null if not found.
   */
  const getPersonId = async (personData) => {
    if (!getDocumentsByField) return null;
    const {normalizedName, normalizedMemo} = normalizePersonData(personData);
    const identifier = buildIdentifier(
      {normalizedName, normalizedMemo},
      logger,
    );
    if (!identifier) return null;
    const snapshot = await getDocumentsByField(
      'peopleIds',
      'identifier',
      identifier,
    );
    if (!snapshot?.empty) {
      const doc = snapshot.docs[0];
      if (typeof doc.data === 'function') {
        const data = doc.data();
        if (data?.id) return data.id;
      }
      return doc.id;
    }
    return null;
  };

  /**
   * Saves an entry for a person.
   * @param {*} data - The entry data to be saved.
   * @returns {Promise<string|null>} - The person document ID or null on failure. 
   */
  const saveEntry = async (data = {}) => {
    const {normalizedName, normalizedMemo} = normalizePersonData(data);
    if (!requireUniqueIdentifier(normalizedName, normalizedMemo, logger)) {
      return null;
    }

    try {
      const entryData = buildEntryData(data, normalizedName, normalizedMemo);

      const personId = await ensurePersonId(entryData);
      await writeEntryForDate(personId, entryData);
      return personId;
    } catch (error) {
      logger.warn('Failed to save to Firestore:', error);
      return null;
    }
  };

  /**
   * Upserts a person document and saves an entry.
   * @param {*} personData - The person data containing name and memo.
   * @returns {Promise<string|null>} - The person document ID or null on failure.
   */
  const upsertPerson = async (personData = {}) => {
    const {normalizedName, normalizedMemo} = normalizePersonData(personData);
    if (!requireUniqueIdentifier(normalizedName, normalizedMemo, logger)) {
      return null;
    }

    const entryData = buildEntryData(personData, normalizedName, normalizedMemo);

    try {
      const personId = await ensurePersonId(entryData);
      await writeEntryForDate(personId, entryData);
      return personId;
    } catch (error) {
      logger.warn('Failed to upsert person:', error);
      return null;
    }
  };

  return {hasLastName, saveEntry, savePersonId, getPersonId, upsertPerson};
};

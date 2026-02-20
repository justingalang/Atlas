import {createPersonHandlers, hasLastName} from './personHandlers';

const buildSnapshot = (docs) => ({
  empty: docs.length === 0,
  docs,
});

describe('personHandlers', () => {
  const fixedDate = '2024-01-02T03:04:05.000Z';
  let addDocument;
  let addSubcollectionDocument;
  let getDocumentsByField;
  let logger;
  let handlers;

  const createHandlers = () =>
    createPersonHandlers({
      addDocument,
      addSubcollectionDocument,
      getDocumentsByField,
      now: () => fixedDate,
      logger,
    });

  beforeEach(() => {
    addDocument = jest.fn();
    addSubcollectionDocument = jest.fn();
    getDocumentsByField = jest.fn();
    logger = {warn: jest.fn(), error: jest.fn()};
    handlers = createHandlers();
  });

  test('hasLastName detects presence of a last name', () => {
    expect(hasLastName('Ada Lovelace')).toBe(true);
    expect(hasLastName('Prince')).toBe(false);
  });

  test('requires memo when no last name is provided', async () => {
    await handlers.saveEntry({name: 'Prince'});
    expect(logger.warn).toHaveBeenCalledWith(
      'Provide either a memo or a full name with a last name.',
    );
    expect(addDocument).not.toHaveBeenCalled();
    expect(addSubcollectionDocument).not.toHaveBeenCalled();
  });

  test('allows saving without memo when a last name exists', async () => {
    getDocumentsByField.mockResolvedValue(buildSnapshot([]));
    addDocument.mockResolvedValue({id: 'person-001'});

    await handlers.saveEntry({name: 'Ada Lovelace'});

    expect(addDocument).toHaveBeenNthCalledWith(1, 'people', {
      name: 'Ada Lovelace',
      memo: '',
    });
    expect(addDocument).toHaveBeenNthCalledWith(2, 'peopleIds', {
      identifier: 'Ada Lovelace',
      id: 'person-001',
    });
    expect(addSubcollectionDocument).toHaveBeenCalledWith(
      'people',
      'person-001',
      'entries',
      expect.objectContaining({date: fixedDate, entryDate: '2024-01-02'}),
      '2024-01-02',
    );
  });

  test('saves identifier as "Name-Memo" when last name is missing', async () => {
    getDocumentsByField.mockResolvedValue(buildSnapshot([]));
    addDocument.mockResolvedValue({id: 'alpha'});

    await handlers.savePersonId({name: 'Cher', memo: 'Singer'}, 'alpha');

    expect(addDocument).toHaveBeenCalledWith('peopleIds', {
      identifier: 'Cher-Singer',
      id: 'alpha',
    });
  });

  test('retrieves and updates entries using the unique identifier', async () => {
    getDocumentsByField
      .mockResolvedValueOnce(
        buildSnapshot([{id: 'mappingDoc', data: () => ({id: 'existing-123'})}]),
      )
      .mockResolvedValueOnce(buildSnapshot([]));

    await handlers.saveEntry({
      name: 'Ada Lovelace',
      memo: 'Historic',
      place: 'Library',
    });

    expect(addSubcollectionDocument).toHaveBeenCalledWith(
      'people',
      'existing-123',
      'entries',
      expect.objectContaining({
        place: 'Library',
        date: fixedDate,
        entryDate: '2024-01-02',
      }),
      '2024-01-02',
    );
    expect(addDocument).toHaveBeenCalledTimes(1);
    expect(addDocument).toHaveBeenCalledWith(
      'people',
      {name: 'Ada Lovelace', memo: ''},
      'existing-123',
    );
  });

  test('getPersonId returns stored id from identifier mapping', async () => {
    const snapshot = buildSnapshot([
      {id: 'map-1', data: () => ({id: 'person-777'})},
    ]);
    getDocumentsByField.mockResolvedValue(snapshot);

    const personId = await handlers.getPersonId({
      name: 'Bruce Wayne',
      memo: 'Batman',
    });

    expect(personId).toBe('person-777');
    expect(getDocumentsByField).toHaveBeenCalledWith(
      'peopleIds',
      'identifier',
      'Bruce Wayne',
    );
  });

  test('upsertPerson updates existing record when identifier exists', async () => {
    getDocumentsByField
      .mockResolvedValueOnce(
        buildSnapshot([{id: 'map-2', data: () => ({id: 'person-200'})}]),
      )
      .mockResolvedValueOnce(buildSnapshot([]));

    await handlers.upsertPerson({name: 'Ada Lovelace', memo: 'Math', place: 'Hall'});

    expect(addDocument).toHaveBeenCalledTimes(1);
    expect(addDocument).toHaveBeenCalledWith(
      'people',
      {name: 'Ada Lovelace', memo: ''},
      'person-200',
    );
    expect(addSubcollectionDocument).toHaveBeenCalledWith(
      'people',
      'person-200',
      'entries',
      expect.objectContaining({
        place: 'Hall',
        date: fixedDate,
        entryDate: '2024-01-02',
      }),
      '2024-01-02',
    );
  });

  test('upsertPerson creates a new record and mapping when identifier is new', async () => {
    getDocumentsByField
      .mockResolvedValueOnce(buildSnapshot([]))
      .mockResolvedValueOnce(buildSnapshot([]));
    addDocument
      .mockResolvedValueOnce({id: 'person-300'}) // people doc
      .mockResolvedValueOnce({id: 'person-300'}); // peopleIds doc return value ignored

    await handlers.upsertPerson({name: 'Prince', memo: 'Musician', place: 'Stage'});

    expect(addDocument).toHaveBeenCalledTimes(2);
    expect(addDocument).toHaveBeenNthCalledWith(1, 'people', {
      name: 'Prince',
      memo: 'Musician',
    });
    expect(addDocument).toHaveBeenNthCalledWith(2, 'peopleIds', {
      identifier: 'Prince-Musician',
      id: 'person-300',
    });
    expect(addSubcollectionDocument).toHaveBeenCalledWith(
      'people',
      'person-300',
      'entries',
      expect.objectContaining({
        place: 'Stage',
        date: fixedDate,
        entryDate: '2024-01-02',
      }),
      '2024-01-02',
    );
  });

  test('upsertPerson merges data into an existing entry on the same day', async () => {
    getDocumentsByField
      .mockResolvedValueOnce(
        buildSnapshot([{id: 'map-4', data: () => ({id: 'person-400'})}]),
      )
      .mockResolvedValueOnce(
        buildSnapshot([
          {
            id: '2024-01-02',
            data: () => ({place: 'Library', entryDate: '2024-01-02', date: fixedDate}),
          },
        ]),
      );

    await handlers.upsertPerson({
      name: 'Ada Lovelace',
      memo: 'Math',
      place: 'Hall',
      items: ['Note'],
    });

    expect(addSubcollectionDocument).toHaveBeenCalledWith(
      'people',
      'person-400',
      'entries',
      expect.objectContaining({
        place: 'Hall',
        items: ['Note'],
        entryDate: '2024-01-02',
        date: fixedDate,
      }),
      '2024-01-02',
    );
  });
});

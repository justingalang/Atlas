// Helper functions to manage people-related data
import { addSubcollectionDocument, addDocument } from '../services/firebaseService';

/**
 * Saves an entry for a person in the Firestore database.
 * @param {string} docId - The document ID for the person.
 * @param {Object} data - The data to save in the entry.
 * @param {string} date - The date of the entry.
 * @param {string} name - The name of the person.
 * @returns {Promise<void>}
 */
 export const savePersonEntry = async (docId, data, date, name) => {
  try {
    let dataWithDate = { ...data, date };
    await addSubcollectionDocument('people', docId, 'entries', dataWithDate, date);
    await addDocument('people', { name: name.trim() || 'Unnamed' }, docId);
  }
  catch (error) {
    console.warn('Failed to save to Firestore:', error);
  }
}

/**
 * Writes the name of a person to Firestore.
 * @param {string} name - The name of the person.
 * @param {Function} saveEntry - The function to save the entry.
 * @returns {Promise<void>}
 */
export const writePersonName = async (name, saveEntry) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  await saveEntry(trimmed, { name: trimmed });
}

/**
 * Writes the place of a person to Firestore.
 * @param {string} name - The name of the person.
 * @param {string} place - The place to write.
 * @param {Function} saveEntry - The function to save the entry.
 * @returns {Promise<void>}
 */
export const writePersonPlace = async (name, place, saveEntry) => {
  const docId = name.trim();
  const trimmedPlace = place.trim();
  if (!docId || !trimmedPlace) return;
  await saveEntry(docId, { place: trimmedPlace });
}

/**
 * Writes the items of a person to Firestore.
 * @param {string} name - The name of the person.
 * @param {Array} items - The items to write.
 * @param {Function} saveEntry - The function to save the entry.
 * @returns {Promise<void>}
 */
export const writePersonItems = async (name, items, saveEntry) => {
  const docId = name.trim();
  if (!docId || !items || items.length === 0) return;
  await saveEntry(docId, { items });
}

const getPersonByName = async (name) => {
  // Implementation to fetch person by name from Firestore
}

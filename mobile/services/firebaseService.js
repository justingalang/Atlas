import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {db} from '../firebase';

export const addDocument = async (collectionName, data, documentId = undefined) => {
  if (!collectionName) {
    throw new Error('collectionName is required');
  }

  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  if (typeof documentId === 'string' && documentId.trim()) {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data, {merge: true});
    return docRef;
  }

  return addDoc(collection(db, collectionName), data);
};

export const updateDocument = async (collectionName, documentId, data) => {
  if (!collectionName || !documentId) {
    throw new Error('collectionName and documentId are required');
  }

  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, data);
  return docRef;
};

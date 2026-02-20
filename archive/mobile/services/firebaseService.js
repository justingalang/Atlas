import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
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

export const addSubcollectionDocument = async (
  collectionName,
  documentId,
  subcollectionName,
  data,
  subdocumentId = undefined,
) => {
  if (!collectionName || !documentId || !subcollectionName) {
    throw new Error(
      'collectionName, documentId, and subcollectionName are required',
    );
  }

  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const subcollectionRef = collection(
    db,
    collectionName,
    documentId,
    subcollectionName,
  );

  if (typeof subdocumentId === 'string' && subdocumentId.trim()) {
    const subdocRef = doc(subcollectionRef, subdocumentId);
    await setDoc(subdocRef, data, {merge: true});
    return subdocRef;
  }

  return addDoc(subcollectionRef, data);
};

export const updateSubcollectionDocument = async (
  collectionName,
  documentId,
  subcollectionName,
  subdocumentId,
  data,
) => {
  if (!collectionName || !documentId || !subcollectionName || !subdocumentId) {
    throw new Error(
      'collectionName, documentId, subcollectionName, and subdocumentId are required',
    );
  }

  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const subdocRef = doc(
    db,
    collectionName,
    documentId,
    subcollectionName,
    subdocumentId,
  );
  await updateDoc(subdocRef, data);
  return subdocRef;
};

export const getDocumentsByField = async (collectionName, field, value) => {
  if (!collectionName || !field) {
    throw new Error('collectionName and field are required');
  }

  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const collectionRef = collection(db, collectionName);
  const documentsQuery = query(collectionRef, where(field, '==', value));
  return getDocs(documentsQuery);
};

export const queryDocuments = async (collectionName, constraints = []) => {
  if (!collectionName) {
    throw new Error('collectionName is required');
  }
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  const collectionRef = collection(db, collectionName);
  const documentsQuery =
    Array.isArray(constraints) && constraints.length > 0
      ? query(collectionRef, ...constraints)
      : collectionRef;
  return getDocs(documentsQuery);
};

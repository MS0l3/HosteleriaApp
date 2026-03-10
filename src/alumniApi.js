import { firebaseConfig } from './firebaseConfig';

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;

const toPlainAlumni = (doc) => ({
  id: doc.name?.split('/').pop() ?? '',
  name: doc.fields?.Name?.stringValue ?? 'Sense nom',
  photoUrl: doc.fields?.PhotoURL?.stringValue ?? '',
});

export async function fetchAlumni() {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Alumni?key=${apiKey}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error('No se pudo cargar Alumni desde Firebase.');
  }

  const data = await response.json();
  const documents = data.documents ?? [];
  return documents.map(toPlainAlumni);
}

import { firebaseConfig } from './firebaseConfig';

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;

const toPlainAlumni = (doc) => ({
  id: doc.name?.split('/').pop() ?? '',
  name: doc.fields?.Name?.stringValue ?? 'Sense nom',
  photoUrl: doc.fields?.PhotoURL?.stringValue ?? '',
});

const parseCoordinate = (value) => {
  if (!value) {
    return null;
  }

  const clean = value.replace(/\[|\]/g, '').trim();
  const parts = clean.split(',').map((part) => part.trim());

  if (parts.length < 2) {
    return null;
  }

  const parsePart = (part) => {
    const number = Number.parseFloat(part);

    if (Number.isNaN(number)) {
      return null;
    }

    if (part.toUpperCase().includes('S') || part.toUpperCase().includes('W')) {
      return -Math.abs(number);
    }

    return number;
  };

  const lat = parsePart(parts[0]);
  const lng = parsePart(parts[1]);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const toPlainRestaurant = (doc) => {
  const geoPoint = doc.fields?.Location?.geoPointValue;
  const locationString = doc.fields?.Location?.stringValue;

  const location = geoPoint
    ? { lat: geoPoint.latitude, lng: geoPoint.longitude }
    : parseCoordinate(locationString);

  return {
    id: doc.name?.split('/').pop() ?? '',
    name: doc.fields?.Name?.stringValue ?? 'Restaurant sense nom',
    location,
  };
};

async function fetchCollection(collectionName, errorMessage) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?key=${apiKey}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.documents ?? [];
}

export async function fetchAlumni() {
  const documents = await fetchCollection('Alumni', 'No se pudo cargar Alumni desde Firebase.');
  return documents.map(toPlainAlumni);
}

export async function fetchRestaurants() {
  const documents = await fetchCollection('Restaurant', 'No se pudo cargar Restaurant desde Firebase.');
  return documents.map(toPlainRestaurant);
}

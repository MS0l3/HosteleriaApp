import { firebaseConfig } from './firebaseConfig';

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;

const getStringField = (fields, candidates, fallback = '') => {
  const match = candidates
    .map((name) => fields?.[name]?.stringValue?.trim())
    .find((value) => value);

  return match ?? fallback;
};

const parseStringList = (arrayField) => {
  const values = arrayField?.arrayValue?.values;
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => {
      if (entry?.stringValue) {
        return entry.stringValue.trim();
      }

      if (entry?.mapValue?.fields?.Name?.stringValue) {
        return entry.mapValue.fields.Name.stringValue.trim();
      }

      return '';
    })
    .filter(Boolean);
};

const toPlainAlumni = (doc) => {
  const fields = doc.fields ?? {};

  return {
    id: doc.name?.split('/').pop() ?? '',
    name: getStringField(fields, ['Name', 'Nom'], 'Sense nom'),
    photoUrl: getStringField(fields, ['PhotoURL', 'Photo', 'Image']),
    contact: {
      email: getStringField(fields, ['Email', 'Mail']),
      phone: getStringField(fields, ['Phone', 'Telefon', 'Telèfon']),
      linkedin: getStringField(fields, ['LinkedIn', 'Linkedin', 'LinkedInURL']),
    },
  };
};

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
  const fields = doc.fields ?? {};
  const geoPoint = fields.Location?.geoPointValue;
  const locationString = fields.Location?.stringValue;

  const location = geoPoint
    ? { lat: geoPoint.latitude, lng: geoPoint.longitude }
    : parseCoordinate(locationString);

  const alumniList = parseStringList(fields.Alumni)
    .concat(parseStringList(fields.Alumnes))
    .concat(parseStringList(fields.Students));

  return {
    id: doc.name?.split('/').pop() ?? '',
    name: getStringField(fields, ['Name', 'Nom'], 'Restaurant sense nom'),
    location,
    contact: {
      phone: getStringField(fields, ['Phone', 'Telefon', 'Telèfon']),
      email: getStringField(fields, ['Email', 'Mail']),
    },
    alumniList,
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

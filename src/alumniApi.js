import { firebaseConfig } from './firebaseConfig';

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;

const getStringField = (fields, candidates, fallback = '') => {
  const match = candidates
    .map((name) => fields?.[name]?.stringValue?.trim())
    .find((value) => value);

  return match ?? fallback;
};

const getDocumentId = (doc) => doc.name?.split('/').pop() ?? '';

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

const getRelationBoolean = (fields, candidates, fallback = false) => {
  for (const candidate of candidates) {
    const field = fields?.[candidate];
    if (!field) {
      continue;
    }

    if (typeof field.booleanValue === 'boolean') {
      return field.booleanValue;
    }

    if (typeof field.stringValue === 'string') {
      const normalized = field.stringValue.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
  }

  return fallback;
};

const toPlainAlumni = (doc) => {
  const fields = doc.fields ?? {};

  return {
    id: getDocumentId(doc),
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
    id: getDocumentId(doc),
    name: getStringField(fields, ['Name', 'Nom'], 'Restaurant sense nom'),
    photoUrl: getStringField(fields, ['PhotoURL', 'Photo', 'Image']),
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

const toPlainRelation = (doc) => {
  const fields = doc.fields ?? {};

  return {
    id: getDocumentId(doc),
    alumniId: getStringField(fields, ['id_alumni', 'alumni_id', 'AlumniId', 'AlumneId', 'StudentId']),
    restaurantId: getStringField(fields, ['id_restaurant', 'restaurant_id', 'RestaurantId']),
    role: getStringField(fields, ['rol', 'role', 'Role']),
    currentJob: getRelationBoolean(fields, ['current_job', 'CurrentJob', 'current', 'Current']),
  };
};

async function createDocument(collectionName, fields, errorMessage) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchAlumni() {
  const documents = await fetchCollection('Alumni', 'No se pudo cargar Alumni desde Firebase.');
  return documents.map(toPlainAlumni);
}

export async function fetchRestaurants() {
  const [restaurantDocs, relationDocs, alumniDocs] = await Promise.all([
    fetchCollection('Restaurant', 'No se pudo cargar Restaurant desde Firebase.'),
    fetchCollection('Rest-Alum', 'No se pudo cargar Rest-Alum desde Firebase.').catch(() => []),
    fetchCollection('Alumni', 'No se pudo cargar Alumni desde Firebase.').catch(() => []),
  ]);

  const alumniById = new Map(
    alumniDocs
      .map(toPlainAlumni)
      .map((student) => [student.id, student.name])
  );

  const relationsByRestaurantId = relationDocs
    .map(toPlainRelation)
    .reduce((accumulator, relation) => {
      if (!relation.restaurantId || !relation.alumniId) {
        return accumulator;
      }

      const relationName = alumniById.get(relation.alumniId);
      if (!relationName) {
        return accumulator;
      }

      const existing = accumulator.get(relation.restaurantId) ?? [];
      existing.push(relationName);
      accumulator.set(relation.restaurantId, existing);
      return accumulator;
    }, new Map());

  return restaurantDocs.map((doc) => {
    const restaurant = toPlainRestaurant(doc);
    const relatedAlumni = relationsByRestaurantId.get(restaurant.id) ?? [];
    const mergedAlumni = Array.from(new Set([...restaurant.alumniList, ...relatedAlumni]));

    return {
      ...restaurant,
      alumniList: mergedAlumni,
    };
  });
}

export async function isAdministrator(email) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const documents = await fetchCollection('Administrator', 'No se pudo cargar Administrator desde Firebase.');
  return documents.some((doc) => {
    const fields = doc.fields ?? {};
    const adminEmail = getStringField(fields, ['Email', 'Mail', 'email']).toLowerCase();
    return adminEmail === normalizedEmail;
  });
}

export async function addAlumni(alumniData) {
  const fields = {
    Name: { stringValue: alumniData.name ?? '' },
    Email: { stringValue: alumniData.email ?? '' },
    Phone: { stringValue: alumniData.phone ?? '' },
    LinkedIn: { stringValue: alumniData.linkedin ?? '' },
    PhotoURL: { stringValue: alumniData.photoUrl ?? '' },
    Status: { stringValue: alumniData.status ?? '' },
  };

  const normalizedExperiences = Array.isArray(alumniData.experiences)
    ? alumniData.experiences.filter((experience) => experience?.restaurantId)
    : [];

  if (normalizedExperiences.length) {
    fields.Restaurants = {
      arrayValue: {
        values: normalizedExperiences.map((experience) => ({
          mapValue: {
            fields: {
              RestaurantId: { stringValue: experience.restaurantId ?? '' },
              Role: { stringValue: experience.role ?? '' },
              Current: { booleanValue: Boolean(experience.current) },
            },
          },
        })),
      },
    };
  }

  const createdAlumni = await createDocument('Alumni', fields, 'No se pudo guardar el alumno.');
  const alumniId = getDocumentId(createdAlumni);

  if (alumniId && normalizedExperiences.length) {
    await Promise.all(
      normalizedExperiences.map((experience) =>
        createDocument(
          'Rest-Alum',
          {
            id_alumni: { stringValue: alumniId },
            id_restaurant: { stringValue: experience.restaurantId ?? '' },
            rol: { stringValue: experience.role ?? '' },
            current_job: { stringValue: experience.current ? 'true' : 'false' },
          },
          'No se pudo guardar la relacio entre alumne i restaurant.'
        )
      )
    );
  }

  return createdAlumni;
}

export async function addRestaurant(restaurantData) {
  const fields = {
    Name: { stringValue: restaurantData.name ?? '' },
    Email: { stringValue: restaurantData.email ?? '' },
    Phone: { stringValue: restaurantData.phone ?? '' },
    PhotoURL: { stringValue: restaurantData.photoUrl ?? '' },
  };

  const parsedLat = Number.parseFloat(restaurantData.lat);
  const parsedLng = Number.parseFloat(restaurantData.lng);
  if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
    fields.Location = {
      geoPointValue: {
        latitude: parsedLat,
        longitude: parsedLng,
      },
    };
  }

  return createDocument('Restaurant', fields, 'No se pudo guardar el restaurant.');
}

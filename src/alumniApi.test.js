import { addAlumni, fetchAlumni, fetchRestaurants } from './alumniApi';

jest.mock('./firebaseConfig', () => ({
  firebaseConfig: {
    projectId: 'demo-project',
    apiKey: 'demo-key',
  },
}));

describe('alumniApi relations', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetchRestaurants merges alumni list from Rest-Alum relation collection', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Restaurant/rest-1',
              fields: {
                Name: { stringValue: 'Can Jubilat' },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Rest-Alum/relation-1',
              fields: {
                id_alumni: { stringValue: 'alum-1' },
                id_restaurant: { stringValue: 'rest-1' },
                rol: { stringValue: 'Cuiner/a' },
                current_job: { stringValue: 'false' },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Alumni/alum-1',
              fields: {
                Name: { stringValue: 'Anna Soler' },
              },
            },
          ],
        }),
      });

    const restaurants = await fetchRestaurants();

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].alumniList).toEqual(['Anna Soler']);
    expect(restaurants[0].alumniMembers).toEqual([
      {
        id: 'alum-1',
        name: 'Anna Soler',
        photoUrl: '',
        role: 'Cuiner/a',
        currentJob: false,
      },
    ]);
  });

  test('addAlumni also writes Rest-Alum relations for selected experiences', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/demo/databases/(default)/documents/Alumni/alum-created',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'relation-1' }) });

    await addAlumni({
      name: 'Marc Test',
      experiences: [{ restaurantId: 'rest-2', role: 'Cap de sala', current: true }],
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const relationCall = global.fetch.mock.calls[1];
    expect(relationCall[0]).toContain('/documents/Rest-Alum');

    const relationPayload = JSON.parse(relationCall[1].body);
    expect(relationPayload.fields.id_alumni.stringValue).toBe('alum-created');
    expect(relationPayload.fields.id_restaurant.stringValue).toBe('rest-2');
    expect(relationPayload.fields.rol.stringValue).toBe('Cap de sala');
    expect(relationPayload.fields.current_job.stringValue).toBe('true');
  });

  test('fetchRestaurants keeps relation visible when ids come as references', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Restaurant/rest-ref',
              fields: {
                Name: { stringValue: 'Restaurant Ref' },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Rest-Alum/relation-ref',
              fields: {
                id_alumni: {
                  referenceValue:
                    'projects/demo/databases/(default)/documents/Alumni/alum-reference',
                },
                id_restaurant: {
                  referenceValue:
                    'projects/demo/databases/(default)/documents/Restaurant/rest-ref',
                },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

    const restaurants = await fetchRestaurants();

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].alumniList).toEqual(['alum-reference']);
  });

  test('fetchAlumni merges Restaurants array and Rest-Alum relation entries', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Alumni/alum-1',
              fields: {
                Name: { stringValue: 'Anna Soler' },
                Restaurants: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            RestaurantId: { stringValue: 'rest-array' },
                            Role: { stringValue: 'Pastissera' },
                            Current: { booleanValue: true },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              name: 'projects/demo/databases/(default)/documents/Rest-Alum/relation-1',
              fields: {
                id_alumni: { stringValue: 'alum-1' },
                id_restaurant: { stringValue: 'rest-rel' },
                rol: { stringValue: 'Cuiner/a' },
                current_job: { stringValue: 'false' },
              },
            },
          ],
        }),
      });

    const alumni = await fetchAlumni();

    expect(alumni).toHaveLength(1);
    expect(alumni[0].experiences).toEqual(
      expect.arrayContaining([
        { restaurantId: 'rest-array', role: 'Pastissera', current: true },
        { restaurantId: 'rest-rel', role: 'Cuiner/a', current: false },
      ])
    );
  });
});

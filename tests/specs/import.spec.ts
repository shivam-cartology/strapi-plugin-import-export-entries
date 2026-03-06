const map = require('lodash/map');
const pick = require('lodash/pick');
const dataCreate = require('../mocks/data-create.json');
const dataUpdate = require('../mocks/data-update.json');

const { getService, SLUGS, generateData } = require('../utils');

describe('import service', () => {
  describe('json v2', () => {
    it('should create collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 }), generateData(SLUG, { id: 2 })],
      };

      const fileContent = {
        version: 2,
        data: {
          [SLUG]: Object.fromEntries(CONFIG[SLUG].map((data) => [data.id, data])),
        },
      };

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
        // expect(entries[idx].startDateTime).toBe(configData.startDateTime);
        expect(entries[idx].enabled).toBe(configData.enabled);
      });
    });

    it('should update partially collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      await Promise.all(CONFIG_CREATE[SLUG].map((datum) => strapi.db.query(SLUG).create({ data: datum })));

      const CONFIG_UPDATE = {
        [SLUG]: [pick(generateData(SLUG, { id: 1 }), ['id', 'description', 'startDateTime'])],
      };

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      const [entry] = entries;

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG_UPDATE[SLUG].length);
      expect(entry.id).toBe(CONFIG_CREATE[SLUG][0].id);
      expect(entry.title).toBe(CONFIG_CREATE[SLUG][0].title);
      expect(entry.description).toBe(CONFIG_UPDATE[SLUG][0].description);
      // expect(entry.startDateTime).toBe(CONFIG_UPDATE[SLUG][0].startDateTime);
      expect(entry.enabled).toBe(CONFIG_CREATE[SLUG][0].enabled);
    });

    it('should create collection type localized', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      entries.forEach((entry: any, idx: any) => {
        const configData = CONFIG[SLUG][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
      });
    });

    it('should update collection type localized', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;

      await strapi.db.query(SLUG).create({ data: generateData(SLUG, { id: 1, locale: 'en' }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      entries.forEach((entry: any, idx: any) => {
        const configData = CONFIG[SLUG][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
      });
    });

    it('should create collection type localized with multiple locales', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const CONFIG = {
        [SLUG]: [
          generateData(SLUG, { id: 2, locale: 'en' }),
          generateData(SLUG, { id: 1, locale: 'fr', localizations: [2] }),
          generateData(SLUG, { id: 3, locale: 'it', localizations: [2] }),
        ],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      // In Strapi v5, all locale entries share the same documentId rather than being linked via localizations.
      const entries = await strapi.db.query(SLUG).findMany({});
      const entriesIds = entries.map((e) => e.id);

      expect(failures.length).toBe(0);
      // en, fr, it = 3 locale entries
      expect(entries.length).toBe(3);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG].find((c: any) => c.locale === entry.locale);
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
        // All entries share the same documentId in Strapi v5.
        expect(entry.documentId).toBe(entries[0].documentId);
      });
    });

    it('should update partially collection type localized with multiple locales', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { id: 2, locale: 'en' }), generateData(SLUG, { id: 1, locale: 'fr' }), generateData(SLUG, { id: 3, locale: 'it' })],
      };

      // Create data. In Strapi v5, use the Document Service to create localized entries.
      const enCreated = await strapi.documents(SLUG).create({ data: CONFIG_CREATE[SLUG][0] });
      await strapi.documents(SLUG).update({ documentId: enCreated.documentId, locale: 'fr', data: CONFIG_CREATE[SLUG][1] });
      await strapi.documents(SLUG).update({ documentId: enCreated.documentId, locale: 'it', data: CONFIG_CREATE[SLUG][2] });

      const CONFIG_UPDATE = {
        [SLUG]: [
          pick(generateData(SLUG, { locale: 'en' }), ['locale', 'description', 'startDateTime']),
          pick(generateData(SLUG, { locale: 'fr' }), ['locale', 'description', 'startDateTime']),
          pick(generateData(SLUG, { locale: 'it' }), ['locale', 'description', 'startDateTime']),
        ],
      };

      // Set localizations to map non-default locales to the default locale entry.
      CONFIG_UPDATE[SLUG][1].localizations = [enCreated.id];
      CONFIG_UPDATE[SLUG][2].localizations = [enCreated.id];

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      // In Strapi v5, all locale entries share the same documentId.
      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      entries.forEach((entry) => {
        const createConfigData = CONFIG_CREATE[SLUG].find((c: any) => c.locale === entry.locale);
        const updateConfigData = CONFIG_UPDATE[SLUG].find((c: any) => c.locale === entry.locale);

        expect(entry.title).toBe(createConfigData.title);
        expect(entry.description).toBe(updateConfigData.description);
        // expect(entry.startDateTime).toBe(updateConfigData.startDateTime);
        expect(entry.enabled).toBe(createConfigData.enabled);
        expect(entry.locale).toBe(createConfigData.locale);
        // All entries share the same documentId.
        expect(entry.documentId).toBe(entries[0].documentId);
      });
    });

    it('should create collection type with component', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, component: 1 }), generateData(SLUG, { id: 2, component: 2 })],
        [SLUGS.COMPONENT_COMPONENT]: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }), generateData(SLUGS.COMPONENT_COMPONENT, { id: 2 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({ populate: true } as any);

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        const componentConfigData = CONFIG[SLUGS.COMPONENT_COMPONENT][idx];
        expect(entry.id).toBe(configData.id);
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        // expect(entry.startDateTime).toBe(configData.startDateTime);
        expect(entry.enabled).toBe(configData.enabled);
        expect(entry.component.id).toBe(componentConfigData.id);
        expect(entry.component.name).toBe(componentConfigData.name);
        expect(entry.component.description).toBe(componentConfigData.description);
      });
    });

    it('should create collection type with component repeatable', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, componentRepeatable: [1, 2] })],
        [SLUGS.COMPONENT_COMPONENT]: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }), generateData(SLUGS.COMPONENT_COMPONENT, { id: 2 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({ populate: true } as any);

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      const [entry] = entries;
      expect(entry.id).toBe(CONFIG[SLUG][0].id);
      expect(entry.title).toBe(CONFIG[SLUG][0].title);
      expect(entry.description).toBe(CONFIG[SLUG][0].description);
      // expect(entry.startDateTime).toBe(CONFIG[SLUG][0].startDateTime);
      expect(entry.enabled).toBe(CONFIG[SLUG][0].enabled);
      expect(entry.componentRepeatable[0].id).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].id);
      expect(entry.componentRepeatable[0].name).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].name);
      expect(entry.componentRepeatable[0].description).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].description);
      expect(entry.componentRepeatable[1].id).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].id);
      expect(entry.componentRepeatable[1].name).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].name);
      expect(entry.componentRepeatable[1].description).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].description);
    });

    it('should create single type', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
      });
    });

    it('should update single type', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;

      await strapi.db.query(SLUG).create({ data: generateData(SLUG, { id: 1 }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
      });
    });

    it('should create single type localized', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
      });
    });

    it('should update single type localized', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;

      await strapi.db.query(SLUG).create({ data: generateData(SLUG, { id: 1 }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
      });
    });

    it('should create single type localized with multiple locales', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' }), generateData(SLUG, { id: 2, locale: 'fr' }), generateData(SLUG, { id: 3, locale: 'it' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        // Atm it is not possible to set the `id` for locales that are not the default one.
        if (idx === 0) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
      });
    });

    it('should update partially single type localized with multiple locales', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { locale: 'en' }), generateData(SLUG, { locale: 'fr' }), generateData(SLUG, { locale: 'it' })],
      };

      // Create data. In Strapi v5, use the Document Service to create localized entries.
      const enCreated = await strapi.documents(SLUG).create({ data: CONFIG_CREATE[SLUG][0] });
      await strapi.documents(SLUG).update({ documentId: enCreated.documentId, locale: 'fr', data: CONFIG_CREATE[SLUG][1] });
      await strapi.documents(SLUG).update({ documentId: enCreated.documentId, locale: 'it', data: CONFIG_CREATE[SLUG][2] });

      const CONFIG_UPDATE = {
        [SLUG]: [
          pick(generateData(SLUG, { locale: 'en' }), ['locale', 'description']),
          pick(generateData(SLUG, { locale: 'fr' }), ['locale', 'description']),
          pick(generateData(SLUG, { locale: 'it' }), ['locale', 'description']),
        ],
      };

      // Set localizations to map non-default locales back to the default locale entry.
      CONFIG_UPDATE[SLUG][1].localizations = [enCreated.id];
      CONFIG_UPDATE[SLUG][2].localizations = [enCreated.id];

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      // In Strapi v5, all locale entries share the same documentId.
      const entries = await strapi.db.query(SLUG).findMany({});

      expect(failures.length).toBe(0);
      entries.forEach((entry) => {
        const createConfigData = CONFIG_CREATE[SLUG].find((c: any) => c.locale === entry.locale);
        const updateConfigData = CONFIG_UPDATE[SLUG].find((c: any) => c.locale === entry.locale);

        expect(entry.title).toBe(createConfigData.title);
        expect(entry.description).toBe(updateConfigData.description);
        expect(entry.locale).toBe(createConfigData.locale);
        // All entries share the same documentId.
        expect(entry.documentId).toBe(entries[0].documentId);
      });
    });

    it('should create single type with component', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, component: 1 })],
        [SLUGS.COMPONENT_COMPONENT]: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({ populate: true } as any);

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      const [entry] = entries;
      const configData = CONFIG[SLUG][0];
      const componentConfigData = CONFIG[SLUGS.COMPONENT_COMPONENT][0];
      expect(entry.id).toBe(configData.id);
      expect(entry.title).toBe(configData.title);
      expect(entry.description).toBe(configData.description);
      expect(entry.component.id).toBe(componentConfigData.id);
      expect(entry.component.name).toBe(componentConfigData.name);
      expect(entry.component.description).toBe(componentConfigData.description);
    });

    it('should create single type with component repeatable', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, componentRepeatable: [1, 2] })],
        [SLUGS.COMPONENT_COMPONENT]: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }), generateData(SLUGS.COMPONENT_COMPONENT, { id: 2 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany({ populate: true } as any);

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      const [entry] = entries;
      expect(entry.id).toBe(CONFIG[SLUG][0].id);
      expect(entry.title).toBe(CONFIG[SLUG][0].title);
      expect(entry.description).toBe(CONFIG[SLUG][0].description);
      // expect(entry.startDateTime).toBe(CONFIG[SLUG][0].startDateTime);
      expect(entry.enabled).toBe(CONFIG[SLUG][0].enabled);
      expect(entry.componentRepeatable[0].id).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].id);
      expect(entry.componentRepeatable[0].name).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].name);
      expect(entry.componentRepeatable[0].description).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][0].description);
      expect(entry.componentRepeatable[1].id).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].id);
      expect(entry.componentRepeatable[1].name).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].name);
      expect(entry.componentRepeatable[1].description).toBe(CONFIG[SLUGS.COMPONENT_COMPONENT][1].description);
    });

    it('should import relations in any order', async () => {
      const CONFIG = {
        [SLUGS.RELATION_A]: [generateData(SLUGS.RELATION_A, { id: 1, relationOneToOne: 1 })],
        [SLUGS.RELATION_B]: [generateData(SLUGS.RELATION_B, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUGS.RELATION_A, user: {}, idField: 'id' });

      const [entriesA, entriesB] = await Promise.all([strapi.db.query(SLUGS.RELATION_A).findMany({}), strapi.db.query(SLUGS.RELATION_B).findMany({})]);

      expect(failures.length).toBe(0);

      expect(entriesA.length).toBe(CONFIG[SLUGS.RELATION_A].length);
      CONFIG[SLUGS.RELATION_A].forEach((configData, idx) => {
        expect(entriesA[idx].id).toBe(configData.id);
        expect(entriesA[idx].title).toBe(configData.title);
        expect(entriesA[idx].description).toBe(configData.description);
      });

      expect(entriesB.length).toBe(CONFIG[SLUGS.RELATION_B].length);
      CONFIG[SLUGS.RELATION_B].forEach((configData, idx) => {
        expect(entriesB[idx].id).toBe(configData.id);
        expect(entriesB[idx].title).toBe(configData.title);
        expect(entriesB[idx].description).toBe(configData.description);
      });
    });

    it('should have failures if missing required field', async () => {
      const CONFIG = {
        [SLUGS.RELATION_A]: [{ id: 1 }],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUGS.RELATION_A, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUGS.RELATION_A).findMany({});

      expect(failures.length).toBeGreaterThanOrEqual(1);
      expect(entries.length).toBe(0);
    });

    it('should create entries when import file', async () => {
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });

      let entries = await strapi.db.query('api::restaurant.restaurant').findMany({
        populate: {
          logo: true,
          owned_by: true,
          utensils: {
            populate: true,
          },
        },
      } as any);

      expect(entries.length).toBe(3);

      const enEntry = entries.find((e: any) => e.name === 'Dubillot Brasserie');
      const frEntry = entries.find((e: any) => e.name === 'Brasserie Dubillot');
      const martinEntry = entries.find((e: any) => e.name === 'Martin Brasserie');

      expect(enEntry.locale).toBe('en');
      expect(enEntry.description).toBe('Awesome restaurant');
      expect(enEntry.owned_by.name).toBe('Charles');
      expect(enEntry.utensils.length).toBe(2);
      expect(enEntry.utensils[0].name).toBe('Fork');
      expect(enEntry.utensils[0].made_by.name).toBe('Moulinex');
      expect(enEntry.utensils[1].name).toBe('Knife');
      expect(enEntry.utensils[1].made_by.name).toBe('SEB');
      // In Strapi v5, the en and fr entries share the same documentId.
      expect(enEntry.documentId).toBe(frEntry.documentId);

      expect(martinEntry.locale).toBe('en');
      expect(martinEntry.description).toBe('Checkout the chicken');
      expect(martinEntry.owned_by.name).toBe('Victor');
      expect(martinEntry.utensils.length).toBe(1);
      expect(martinEntry.utensils[0].name).toBe('Fork');

      expect(frEntry.locale).toBe('fr');
      expect(frEntry.description).toBe('Incroyable restaurant');
      expect(frEntry.owned_by.name).toBe('Charles');
      expect(frEntry.utensils.length).toBe(2);
      expect(frEntry.utensils[0].name).toBe('Fork');
      expect(frEntry.utensils[0].made_by.name).toBe('Moulinex');
      expect(frEntry.utensils[1].name).toBe('Knife');
      expect(frEntry.utensils[1].made_by.name).toBe('SEB');
      // The fr and en entries share the same documentId.
      expect(frEntry.documentId).toBe(enEntry.documentId);
    });

    it('should download media when import file', async () => {
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });

      let entries = await strapi.db.query('api::restaurant.restaurant').findMany({
        populate: {
          logo: true,
        },
      } as any);

      expect(entries[0].logo.name).toBe('gtv-videos-bucket-sample-images-BigBuckBunny.jpg');
      expect(entries[1].logo.name).toBe('gtv-videos-bucket-sample-images-ForBiggerBlazes.jpg');
      expect(entries[0].logo.name).toBe('gtv-videos-bucket-sample-images-BigBuckBunny.jpg');
    });

    it('should download media of component when import file', async () => {
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });

      let entries = await strapi.db.query('api::restaurant.restaurant').findMany({
        populate: {
          utensils: {
            populate: true,
          },
        },
      } as any);

      expect(entries[0].utensils[0].picture.name).toBe('gtv-videos-bucket-sample-images-ForBiggerJoyrides.jpg');
      expect(entries[0].utensils[1].picture.name).toBe('gtv-videos-bucket-sample-images-TearsOfSteel.jpg');
      expect(entries[2].utensils[0].picture.name).toBe('gtv-videos-bucket-sample-images-ForBiggerJoyrides.jpg');
      expect(entries[2].utensils[0].picture.name).toBe('gtv-videos-bucket-sample-images-ForBiggerJoyrides.jpg');
      expect(entries[2].utensils[1].picture.name).toBe('gtv-videos-bucket-sample-images-TearsOfSteel.jpg');
    });

    it('should be idempotent when import same file multiple times', async () => {
      // 1st import.
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });
      // 2nd import.
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });

      const entries = await strapi.db.query('api::restaurant.restaurant').findMany({
        populate: {
          logo: true,
          owned_by: true,
          utensils: {
            populate: true,
          },
        },
      } as any);

      expect(entries.length).toBe(3);

      const enEntry = entries.find((e: any) => e.name === 'Dubillot Brasserie');
      const frEntry = entries.find((e: any) => e.name === 'Brasserie Dubillot');
      const martinEntry = entries.find((e: any) => e.name === 'Martin Brasserie');

      expect(enEntry.locale).toBe('en');
      expect(enEntry.description).toBe('Awesome restaurant');
      expect(enEntry.owned_by.name).toBe('Charles');
      expect(enEntry.utensils.length).toBe(2);
      expect(enEntry.utensils[0].name).toBe('Fork');
      expect(enEntry.utensils[0].made_by.name).toBe('Moulinex');
      expect(enEntry.utensils[1].name).toBe('Knife');
      expect(enEntry.utensils[1].made_by.name).toBe('SEB');
      // In Strapi v5, the en and fr entries share the same documentId.
      expect(enEntry.documentId).toBe(frEntry.documentId);

      expect(martinEntry.locale).toBe('en');
      expect(martinEntry.description).toBe('Checkout the chicken');
      expect(martinEntry.owned_by.name).toBe('Victor');
      expect(martinEntry.utensils.length).toBe(1);
      expect(martinEntry.utensils[0].name).toBe('Fork');

      expect(frEntry.locale).toBe('fr');
      expect(frEntry.description).toBe('Incroyable restaurant');
      expect(frEntry.owned_by.name).toBe('Charles');
      expect(frEntry.utensils.length).toBe(2);
      expect(frEntry.utensils[0].name).toBe('Fork');
      expect(frEntry.utensils[0].made_by.name).toBe('Moulinex');
      expect(frEntry.utensils[1].name).toBe('Knife');
      expect(frEntry.utensils[1].made_by.name).toBe('SEB');
      expect(frEntry.documentId).toBe(enEntry.documentId);
    });

    it('should download media only once when import same file multiple times', async () => {
      // 1st import.
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });
      // 2nd import.
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });

      const fileEntries = await strapi.db.query('plugin::upload.file').findMany({});
      expect(fileEntries.length).toBe(4);
    });

    it('should update entries when import file', async () => {
      // First, create entries.
      await getService('import').importDataV2(dataCreate, { slug: 'custom:db', user: {} });
      // Then, update entries.
      await getService('import').importDataV2(dataUpdate, { slug: 'custom:db', user: {} });

      const entries = await strapi.db.query('api::restaurant.restaurant').findMany({
        populate: {
          owned_by: true,
          utensils: {
            populate: true,
          },
        },
      } as any);

      expect(entries.length).toBe(3);

      const enEntry = entries.find((e: any) => e.name === 'Dubillot Brasserie');
      const frEntry = entries.find((e: any) => e.name === 'Brasserie Dubillot');
      const martinEntry = entries.find((e: any) => e.name === 'Martin Brasserie');

      expect(enEntry.locale).toBe('en');
      expect(enEntry.description).toBe('Awesome restaurant with insane wines');
      expect(enEntry.owned_by.name).toBe('Charles Magne');
      expect(enEntry.utensils.length).toBe(1);
      expect(enEntry.utensils[0].name).toBe('Fork');
      expect(enEntry.utensils[0].description).toBe('Really efficient in chess');
      expect(enEntry.utensils[0].made_by.name).toBe('Moulinex');
      // In Strapi v5, the en and fr entries share the same documentId.
      expect(enEntry.documentId).toBe(frEntry.documentId);

      expect(martinEntry.locale).toBe('en');
      expect(martinEntry.description).toBe('Checkout the chicken and the French fries');
      expect(martinEntry.owned_by.name).toBe('Victor Ovitch');
      expect(martinEntry.utensils.length).toBe(1);
      expect(martinEntry.utensils[0].name).toBe('Fork');
      expect(martinEntry.utensils[0].description).toBe('Really efficient in chess');

      expect(frEntry.locale).toBe('fr');
      expect(frEntry.description).toBe('Incroyable restaurant avec ses excellents vins');
      expect(frEntry.owned_by.name).toBe('Charles Magne');
      expect(frEntry.utensils.length).toBe(1);
      expect(frEntry.utensils[0].name).toBe('Fork');
      expect(frEntry.utensils[0].description).toBe('Really efficient in chess');
      expect(frEntry.utensils[0].made_by.name).toBe('Moulinex');
      expect(frEntry.documentId).toBe(enEntry.documentId);
    });
  });
});

const buildJsonV2FileContent = (config: any) => {
  return {
    version: 2,
    data: Object.fromEntries(map(config, (data: any, slug: any) => [slug, Object.fromEntries(data.map((datum: any) => [datum.id, datum]))])),
  };
};

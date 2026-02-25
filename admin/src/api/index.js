import { getFetchClient } from '@strapi/strapi/admin';

import pluginId from '../pluginId';

export const api = {
  exportData,
  getModelAttributes,
  importData,
};

async function exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness, exportPluginsContentTypes }) {
  const { post } = getFetchClient();
  const { data } = await post(`/${pluginId}/export/contentTypes`, {
    slug, search, applySearch, exportFormat, relationsAsId, deepness, exportPluginsContentTypes
  });
  return data;
}

/**
 * Get the attributes of a model.
 * @param {Object} options
 * @param {string} options.slug - Slug of the model.
 * @returns
 */
async function getModelAttributes({ slug }) {
  const { get } = getFetchClient();
  const { data: resData } = await get(`/${pluginId}/import/model-attributes/${slug}`);
  return resData.data.attribute_names;
}

async function importData({ slug, data, format, idField }) {
  const { post } = getFetchClient();
  const { data: resData } = await post(`/${pluginId}/import`, {
    slug, data, format, idField
  });
  return resData;
}

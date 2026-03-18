/**
 * Filter Format Parser - PURE functions
 * Parse filter format YAML configs into structured objects.
 */

/**
 * Filter filenames that match the filter format pattern
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Matching filter format filenames
 */
export function filterFormatFiles(files) {
  return files.filter(f =>
    f.startsWith('filter.format.') && f.endsWith('.yml')
  );
}

/**
 * Extract format ID from filename
 * @param {string} filename - e.g. 'filter.format.civictheme_rich_text.yml'
 * @returns {string|null} - Format ID or null
 */
export function extractFormatIdFromFilename(filename) {
  const prefix = 'filter.format.';
  const suffix = '.yml';
  if (filename.startsWith(prefix) && filename.endsWith(suffix)) {
    return filename.slice(prefix.length, -suffix.length);
  }
  return null;
}

/**
 * Parse a filter format YAML object
 * @param {object} config - Parsed YAML config
 * @returns {object|null} - Parsed filter format or null
 */
export function parseFilterFormat(config) {
  if (!config) return null;

  const filters = config.filters || {};
  const activeFilters = [];
  let allowedHtml = null;
  let mediaEmbed = null;
  let htmlRestricted = false;
  let htmlEscaped = false;
  let linkit = false;

  for (const [id, filter] of Object.entries(filters)) {
    if (!filter.status) continue;

    activeFilters.push({
      id: filter.id || id,
      provider: filter.provider || '',
      weight: filter.weight ?? 0
    });

    if (id === 'filter_html' && filter.settings?.allowed_html) {
      htmlRestricted = true;
      allowedHtml = filter.settings.allowed_html;
    }

    if (id === 'filter_html_escape') {
      htmlEscaped = true;
    }

    if (id === 'media_embed') {
      const settings = filter.settings || {};
      const allowedTypes = settings.allowed_media_types
        ? Object.keys(settings.allowed_media_types)
        : [];
      mediaEmbed = {
        defaultViewMode: settings.default_view_mode || 'default',
        allowedMediaTypes: allowedTypes
      };
    }

    if (id === 'linkit') {
      linkit = true;
    }
  }

  return {
    id: config.format || '',
    name: config.name || '',
    status: config.status !== false,
    weight: config.weight ?? 0,
    htmlMode: htmlEscaped ? 'escaped' : (htmlRestricted ? 'restricted' : 'full'),
    allowedHtml,
    mediaEmbed,
    linkit,
    filters: activeFilters
  };
}

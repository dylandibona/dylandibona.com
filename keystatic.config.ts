import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'dylandibona.com' } },
  collections: {
    prints: collection({
      label: 'Prints',
      slugField: 'title',
      path: 'src/content/prints/*',
      format: { data: 'json' },
      columns: ['title', 'where'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: { description: 'The slug is the URL and must match the image filename in src/assets/prints.' },
        }),
        where: fields.text({ label: 'Where', description: 'Shown under the title. Leave blank if unsure — blank prints nothing.' }),
        orientation: fields.select({
          label: 'Orientation',
          options: [
            { label: 'Landscape', value: 'landscape' },
            { label: 'Portrait', value: 'portrait' },
          ],
          defaultValue: 'landscape',
        }),
        published: fields.checkbox({ label: 'For sale', defaultValue: true }),
        hero: fields.checkbox({
          label: 'Can fill the homepage',
          description: 'Landscape only. Portraits crop badly full-bleed.',
          defaultValue: false,
        }),
        focal: fields.text({
          label: 'Focal point',
          description: 'The point the homepage crop keeps on phones, as "X% Y%" (object-position). Pick it with _focal-picker.html in the outer folder.',
          defaultValue: '50% 50%',
          validation: { pattern: { regex: /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/, message: 'Use "X% Y%", e.g. "50% 40%".' } },
        }),
      },
    }),
  },
});

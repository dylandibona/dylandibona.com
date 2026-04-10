import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'dylandibona.com' },
  },
  collections: {
    cocktails: collection({
      label: 'Cocktails',
      slugField: 'name',
      path: 'src/content/cocktails/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        order: fields.integer({ label: 'Order', description: 'Lower numbers appear first. Leave blank to sort alphabetically.' }),
        spirit: fields.text({ label: 'Spirit' }),
        desc: fields.text({ label: 'Description', multiline: false }),
        photo: fields.image({
          label: 'Photo',
          directory: 'public/cocktails',
          publicPath: '/cocktails/',
        }),
        ingredients: fields.array(
          fields.text({ label: 'Ingredient' }),
          { label: 'Ingredients', itemLabel: props => props.value }
        ),
        method: fields.text({ label: 'Method', multiline: true }),
      },
    }),
  },
});

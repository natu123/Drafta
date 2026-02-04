import Heading from '@tiptap/extension-heading'

/**
 * Title Node Extension
 *
 * A specialized heading node for document titles.
 * Separated from regular headings to prevent schema ambiguity.
 * - Only allows level 1 (H1)
 * - Belongs to 'title' group (not 'heading' or 'block')
 * - Parses only the first H1 in HTML input
 */
export const Title = Heading.extend({
  name: 'title',
  group: 'title', // Separate from 'heading' group

  // Override parseHTML to only match first-child H1 without data-paste attribute
  // data-paste is added during paste operations to prevent H1 from being parsed as title
  parseHTML() {
    return [
      { tag: 'h1:first-child:not([data-paste])' },
    ]
  },

  // Ensure renderHTML outputs H1
  renderHTML({ HTMLAttributes }) {
    return ['h1', HTMLAttributes, 0]
  },
}).configure({
  levels: [1],
})

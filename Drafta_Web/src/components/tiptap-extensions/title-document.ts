import Document from '@tiptap/extension-document'

/**
 * Custom Document schema: Title + Body
 *
 * Structure: title block+
 * - 'title' is a dedicated node (separate from 'heading')
 * - 'block+' allows one or more block nodes (paragraphs, headings, lists, etc.)
 *
 * This separation prevents ProseMirror schema normalization from
 * adding extra headings when content is set via setContent().
 */
export const TitleDocument = Document.extend({
    content: 'title block+',
})

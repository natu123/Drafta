import { Extension } from '@tiptap/core'

/**
 * PreserveBody Extension
 *
 * Prevents the last paragraph in body from being deleted via Backspace.
 * When user presses Backspace at the start of the only paragraph after the title,
 * move focus to the title instead of deleting the paragraph.
 */
export const PreserveBody = Extension.create({
  name: 'preserveBody',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor
        const { selection, doc } = state
        const { $from, empty } = selection

        // Only handle if selection is empty (cursor, not range)
        if (!empty) {
          return false
        }

        // Check if we're at the start of a paragraph
        const parentNode = $from.parent
        if (parentNode.type.name !== 'paragraph') {
          return false
        }

        // Check if cursor is at the very beginning of the paragraph
        if ($from.parentOffset !== 0) {
          return false
        }

        // Count block nodes after the title (heading)
        // doc structure: heading, block*, so we need at least one block after heading
        let blockCount = 0
        let headingFound = false
        doc.forEach((node, _offset, index) => {
          if (index === 0 && node.type.name === 'heading') {
            headingFound = true
          } else if (headingFound) {
            blockCount++
          }
        })

        // If this is the only block after heading and it's empty, don't delete it
        // Instead, move focus to the heading
        if (blockCount === 1 && parentNode.content.size === 0) {
          // Move cursor to end of heading (title)
          const headingNode = doc.firstChild
          if (headingNode && headingNode.type.name === 'heading') {
            const headingEndPos = headingNode.nodeSize - 1
            editor.commands.setTextSelection(headingEndPos)
            return true // Prevent default backspace behavior
          }
        }

        // Let default behavior handle other cases
        return false
      },
    }
  },
})

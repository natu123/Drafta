import ListItem from '@tiptap/extension-list-item'

export const CustomListItem = ListItem.extend({
  name: 'listItem',
  addAttributes() {
    return {
      ...this.parent?.(),
      value: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute('value')
          return value ? parseInt(value, 10) : null
        },
        renderHTML: attributes => {
          if (attributes.value === null || attributes.value === undefined) {
            return {}
          }
          return {
            value: attributes.value,
            style: `--li-value: ${attributes.value}`
          }
        },
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Inherit parent's keyboard shortcuts
      ...this.parent?.(),
      // Explicitly handle Enter key for list item splitting
      Enter: ({ editor }) => {
        // Check if we're in an ordered list and if the current item is empty
        const isOL = editor.isActive('orderedList')

        if (isOL) {
          const { state } = editor
          const { selection } = state
          const { $from } = selection

          // Find the current listItem
          let listItemDepth = -1
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'listItem') {
              listItemDepth = d
              break
            }
          }

          if (listItemDepth > 0) {
            const listItem = $from.node(listItemDepth)
            const isEmpty = listItem.textContent === ''

            if (isEmpty) {
              // Empty list item: lift out of list (keep empty paragraph) and renumber
              // Find the ordered list and get info for renumbering
              let orderedListDepth = -1
              for (let d = listItemDepth - 1; d > 0; d--) {
                if ($from.node(d).type.name === 'orderedList') {
                  orderedListDepth = d
                  break
                }
              }

              if (orderedListDepth > 0) {
                const orderedList = $from.node(orderedListDepth)
                const orderedListPos = $from.before(orderedListDepth)

                // Find current item's value for renumbering
                let currentValue = 1
                orderedList.forEach((node, offset, index) => {
                  const itemStart = orderedListPos + 1 + offset
                  const itemEnd = itemStart + node.nodeSize
                  if ($from.pos >= itemStart && $from.pos <= itemEnd) {
                    currentValue = node.attrs.value || index + 1
                  }
                })

                // Use liftListItem to convert to paragraph (keeps empty line)
                const result = editor.commands.liftListItem('listItem')

                if (result) {
                  // Renumber subsequent items after lift
                  requestAnimationFrame(() => {
                    const { state: newState, view: newView } = editor
                    const { doc } = newState
                    const tr = newState.tr
                    let needsUpdate = false

                    // Find all listItems with values > currentValue and decrement
                    doc.descendants((node, pos) => {
                      if (node.type.name === 'listItem' && node.attrs.value) {
                        if (node.attrs.value > currentValue) {
                          tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            value: node.attrs.value - 1
                          })
                          needsUpdate = true
                        }
                      }
                    })

                    if (needsUpdate && tr.docChanged) {
                      newView.dispatch(tr)
                    }
                  })
                }

                return result
              }
            }
          }
        }

        // Default behavior: split list item
        return editor.commands.splitListItem('listItem')
      },
      // Backspace handler for list item merging (without space insertion)
      Backspace: ({ editor }) => {
        const isOL = editor.isActive('orderedList')
        const isUL = editor.isActive('bulletList')

        // Only handle if we're in a list (OL or UL)
        if (!isOL && !isUL) {
          return false
        }

        const { state, view } = editor
        const { selection } = state
        const { $from } = selection

        // Only handle if cursor is at the start of a listItem
        if (!selection.empty) {
          return false
        }

        // Find the current listItem node
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'listItem') {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) {
          return false
        }

        // Check if cursor is at the very start of the listItem's content
        const listItemStart = $from.start(listItemDepth)
        if ($from.pos !== listItemStart + 1) {
          return false
        }

        // Find the parent list (orderedList or bulletList)
        let listDepth = -1
        let listType = ''
        for (let d = listItemDepth - 1; d > 0; d--) {
          const nodeName = $from.node(d).type.name
          if (nodeName === 'orderedList' || nodeName === 'bulletList') {
            listDepth = d
            listType = nodeName
            break
          }
        }

        if (listDepth === -1) {
          return false
        }

        const list = $from.node(listDepth)
        const listPos = $from.before(listDepth)

        // Find index of current listItem within the list
        let currentIndex = -1
        list.forEach((node, offset, index) => {
          const itemStart = listPos + 1 + offset
          const itemEnd = itemStart + node.nodeSize
          if ($from.pos >= itemStart && $from.pos <= itemEnd) {
            currentIndex = index
          }
        })

        // If this is the first item with empty content, handle lifting and renumbering together
        if (currentIndex === 0) {
          const currentItem = list.child(0)
          const isEmpty = currentItem.textContent === ''

          if (isEmpty && isOL) {
            // Get the value of the item being removed
            const currentValue = currentItem.attrs.value || 1

            // Lift the item out of the list
            const result = editor.commands.liftListItem('listItem')

            if (result) {
              // Use requestAnimationFrame for faster visual update
              requestAnimationFrame(() => {
                const { state: newState, view: newView } = editor
                const { doc } = newState
                const tr = newState.tr
                let needsUpdate = false

                // Find all listItems with values > currentValue and decrement
                doc.descendants((node, pos) => {
                  if (node.type.name === 'listItem' && node.attrs.value) {
                    if (node.attrs.value > currentValue) {
                      tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        value: node.attrs.value - 1
                      })
                      needsUpdate = true
                    }
                  }
                })

                if (needsUpdate && tr.docChanged) {
                  newView.dispatch(tr)
                }
              })
            }

            return result
          }

          // Non-empty first item or bullet list: let default behavior handle it
          return false
        }

        // Get the previous and current items
        const prevItem = list.child(currentIndex - 1)
        const currentItem = list.child(currentIndex)

        // Calculate positions for merging
        let prevItemPos = listPos + 1
        for (let i = 0; i < currentIndex - 1; i++) {
          prevItemPos += list.child(i).nodeSize
        }
        const currentItemPos = prevItemPos + prevItem.nodeSize

        // Get the text content of current item
        const currentText = currentItem.textContent

        // Find the end of the previous item's paragraph (before closing tags)
        // prevItem structure: <li><p>text</p></li>
        // We need to insert at the end of the paragraph inside prevItem
        const prevParagraph = prevItem.firstChild
        if (!prevParagraph) {
          return false
        }

        // Position at the end of text in previous paragraph
        // prevItemPos + 1 (enter li) + prevParagraph.nodeSize - 1 (before </p>)
        const insertPos = prevItemPos + 1 + prevParagraph.nodeSize - 1

        // Create transaction to:
        // 1. Insert current item's text at end of previous item
        // 2. Delete the current list item
        const { tr } = state

        // First, insert text at the end of previous paragraph
        if (currentText) {
          tr.insertText(currentText, insertPos)
        }

        // Then delete the current list item (position shifted by inserted text length)
        const deleteFrom = currentItemPos + currentText.length
        const deleteTo = deleteFrom + currentItem.nodeSize
        tr.delete(deleteFrom, deleteTo)

        // Dispatch the transaction
        view.dispatch(tr)

        // After merge, renumber subsequent items (only for ordered lists)
        if (isOL) {
          setTimeout(() => {
            const { state: newState, view: newView } = editor
            const { doc } = newState
            const newTr = newState.tr

            // Find the ordered list again
            let foundList = false
            doc.descendants((node, pos) => {
              if (foundList) return false
              if (node.type.name === 'orderedList') {
                const { selection: newSelection } = newState
                if (newSelection.$from.pos >= pos && newSelection.$from.pos <= pos + node.nodeSize) {
                  foundList = true
                  let runningValue = 1
                  node.forEach((child, offset, index) => {
                    const childPos = pos + 1 + offset
                    if (index === 0) {
                      runningValue = child.attrs.value !== null ? child.attrs.value : 1
                    } else {
                      runningValue++
                      if (child.attrs.value !== runningValue) {
                        newTr.setNodeMarkup(childPos, undefined, {
                          ...child.attrs,
                          value: runningValue
                        })
                      }
                    }
                  })
                }
              }
            })

            if (newTr.docChanged) {
              newView.dispatch(newTr)
            }
          }, 0)
        }

        // Return true to indicate we handled the event
        return true
      },
    }
  },
})

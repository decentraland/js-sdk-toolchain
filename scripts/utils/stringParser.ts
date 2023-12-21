export function getBlock(str: string, fromPosition: number) {
  let level = 0
  let from, to
  for (let i = fromPosition; i < str.length; i++) {
    const c = str.charAt(i)
    if (c === '{') {
      level++
      if (level === 1) from = i
    }
    if (c === '}') {
      level--
      if (level === 0) {
        to = i
        break
      }
    }
  }

  if (from && to) {
    return str.substring(from + 1, to)
  } else {
    return ''
  }
}

type Line = {
  // First index after \n
  start: number
  // the previous index of \n
  end: number
  // line properties
  isEmpty: boolean
  isPureComment: boolean
  content: string
}

// Only support, lines with //, or /** this */ or /** and the end of block in another line */
// It doesn't support `/** comment */ const code = 'some' /** multi comment block in one line */`
export function parseFileLines(content: string): Line[] {
  const contentLines = content.split('\n')
  const lines: Line[] = []
  let commentBlockStarted = false
  let currentIndex = 0

  for (const contentLine of contentLines) {
    const thisLine: Line = {
      start: currentIndex,
      end: currentIndex + contentLine.length,
      isEmpty: false,
      isPureComment: false,
      content: contentLine
    }
    currentIndex += contentLine.length + 1

    const trimmedLine = contentLine.trim()
    if (trimmedLine.startsWith('/*') || commentBlockStarted) {
      const endOfCommentBlock = trimmedLine.indexOf('*/')
      if (endOfCommentBlock !== -1) {
        thisLine.isPureComment = true
        commentBlockStarted = false
      } else {
        commentBlockStarted = true
      }
      thisLine.isPureComment = true
    } else if (trimmedLine.startsWith('//')) {
      thisLine.isPureComment = true
    } else {
      commentBlockStarted = false
    }

    lines.push(thisLine)
  }

  return lines
}

export function getLineByIndex(lines: Line[], index: number): number {
  return lines.findIndex((line) => index >= line.start && index <= line.end)
}

export function getCommentBeforeAt(lines: Line[], index: number): string | undefined {
  if (index === -1) return

  let lineIndex = getLineByIndex(lines, index)
  if (lineIndex === -1) return

  lineIndex -= 1
  const commentLines: Line[] = []
  while (lineIndex >= 0) {
    if (lines[lineIndex].isPureComment || lines[lineIndex].isEmpty) {
      commentLines.push(lines[lineIndex])
      lineIndex -= 1
    } else {
      break
    }
  }

  const comments = commentLines
    .reverse()
    .map((item) => item.content)
    .join('\n')
  if (comments.length === 0) return

  return comments
}

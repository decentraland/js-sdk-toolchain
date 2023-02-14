import { AiTwotoneFolder, AiTwotoneFolderOpen, AiTwotoneFile } from 'react-icons/ai'
import { DiCss3Full, DiHtml5, DiJavascript1, DiReact } from 'react-icons/di'
import { SiTypescript } from 'react-icons/si'

import { TreeType } from '../../utils/tree'

interface Props {
  fileName: string
  type: TreeType
  expanded: boolean
}

interface IconsByType {
  default: JSX.Element
  expanded: JSX.Element
}

const FILE_ICONS: { [key: string]: JSX.Element } = {
  js: <DiJavascript1 />,
  css: <DiCss3Full />,
  html: <DiHtml5 />,
  jsx: <DiReact />,
  tsx: <DiReact />,
  ts: <SiTypescript />
}

const getIconsByType = (name: string, type: TreeType): IconsByType => {
  switch (type) {
    case 'directory': {
      return {
        default: <AiTwotoneFolder />,
        expanded: <AiTwotoneFolderOpen />
      }
    }
    case 'file':
    default: {
      const ext = name.split('.')[1]
      const icon = FILE_ICONS[ext] || <AiTwotoneFile />
      return {
        default: icon,
        expanded: icon
      }
    }
  }
}

export const Icon = ({ fileName, expanded, type }: Props) => {
  const icons = getIconsByType(fileName, type)
  return expanded ? icons.expanded : icons.default
}

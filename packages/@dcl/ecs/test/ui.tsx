/*
 * @jsx jsx
 */

import jsx from './jsx'

interface DivProps {
  id?: string
}

interface TextProps {
  id?: string
}

function DivUi(props: DivProps, ...children: Node[]) {
  return <divui {...props}>{...children}</divui>
}

function TextUi(props: TextProps, ...children: Node[]) {
  return <textui {...props}>{...children}</textui>
}

export const ui = () => (
  <DivUi>
    <DivUi>
      <TextUi>Ecs 17</TextUi>
      <TextUi>Ecs 117</TextUi>
    </DivUi>
  </DivUi>
)

function addUiSystem() {}

// ui: {
//       "tag": "divui",
//       "attributes": {},
//       "children": [
//         {
//           "tag": "divui",
//           "attributes": {},
//           "children": [
//             {
//               "tag": "textui",
//               "attributes": {
//                   "entity"="",
//                   "parent"=""
//               },
//               "children": [
//                 "Hello There"
//               ]
//             },
//             {
//               "tag": "textui",
//               "attributes": {
//                 "id": "2"
//               },
//               "children": [
//                 "There again"
//               ]
//             }
//           ]
//         }
//       ]
//     }

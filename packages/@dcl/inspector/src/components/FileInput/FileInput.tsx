import React, { PropsWithChildren }  from 'react'
import Dropzone, { DropzoneOptions } from 'react-dropzone'

import { PropTypes } from './types'

function FileInput(props: PropsWithChildren<PropTypes & DropzoneOptions>) {
  return (
    <Dropzone {...props}>
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          {props.children}
        </div>
      )}
    </Dropzone>
  )
}

export default FileInput
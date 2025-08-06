import React, { useEffect, useCallback, useMemo, useState } from 'react'

import { Popup, PopupContent } from 'decentraland-ui'

import { getContentsUrl, isSmart, type Asset as AssetType } from '../../../lib/logic/catalog'
import { getConfig } from '../../../lib/logic/config'
import { InfoTooltip } from '../../ui'
import Asset from './Asset'

import './AssetContainer.css'

interface AuthorData {
  name: string | null
  avatar: string | null
}

const useAuthorData = (author: string | null): AuthorData => {
  const [state, setState] = useState<AuthorData>({
    name: null,
    avatar: null
  })
  const config = getConfig()

  useEffect(() => {
    if (!author) {
      return
    }

    // Handle Decentraland Foundation case
    if (author === 'Decentraland Foundation') {
      setState({
        name: 'Decentraland Foundation',
        avatar: 'https://decentraland.org/images/logo.png'
      })
      return
    }

    const fetchAuthor = async () => {
      try {
        const req = await fetch(`${config.catalystBaseUrl}/lambdas/profiles`, {
          method: 'POST',
          body: JSON.stringify({ ids: [author] })
        })

        if (!req.ok) {
          throw new Error('Failed to fetch author data')
        }

        const data = (await req.json()) as {
          avatars: Array<{
            hasClaimedName: boolean
            name: string
            avatar: { snapshots: { face256: string } }
          }>
        }

        const profile = data.avatars[0]
        if (!profile) {
          throw new Error('Profile not found')
        }

        setState({
          name: profile.name,
          avatar: profile.avatar.snapshots.face256
        })
      } catch {
        setState({ name: null, avatar: null })
      }
    }

    void fetchAuthor()
  }, [author, config.catalystBaseUrl])

  return state
}

const SmartItemTooltipContent: React.FC<{ asset: AssetType }> = ({ asset }) => {
  const imgSrc = 'preview.png' in asset.contents ? getContentsUrl(asset.contents['preview.png']) : null
  const author = useAuthorData(asset.author || null)

  const hasContent = asset.description || asset.author || imgSrc

  if (!hasContent) {
    return null
  }

  return (
    <div className="SmartItemTooltipContent">
      {imgSrc ? <img src={imgSrc} alt={asset.name} className="SmartItemTooltipPreviewImage" /> : null}

      {(asset.description || asset.author) && (
        <div className="SmartItemTooltipText">
          {asset.description && <div className="SmartItemTooltipDescription">{asset.description}</div>}

          {asset.author && (
            <div className="SmartItemTooltipAuthor">
              <span>Created by</span> {author?.avatar && <img src={author.avatar} height={16} width={16} />}
              {author?.name || asset.author}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SmartItemTooltip: React.FC<{ asset: AssetType }> = ({ asset }) => {
  const hasTooltipContent = asset.description || asset.author || 'preview.png' in asset.contents

  if (!hasTooltipContent) {
    return <Asset value={asset} />
  }

  return (
    <Popup
      className="SmartItemTooltip"
      position="right center"
      trigger={
        <div className="SmartItemTooltipTrigger" role="button" tabIndex={0}>
          <Asset value={asset} />
        </div>
      }
      on="hover"
      mouseEnterDelay={500}
      hideOnScroll={false}
      hoverable
      wide
    >
      <PopupContent>
        <SmartItemTooltipContent asset={asset} />
      </PopupContent>
    </Popup>
  )
}

const AssetContainer: React.FC<{ value: AssetType }> = ({ value }) => {
  const isSmartItem = useMemo(() => isSmart(value), [value])

  const renderAssetWithTooltips = useCallback(() => {
    const assetElement = isSmartItem ? <SmartItemTooltip asset={value} /> : <Asset value={value} />

    return <InfoTooltip text={value.name} trigger={assetElement} hideOnScroll={false} position="top center" />
  }, [value, isSmartItem])

  return renderAssetWithTooltips()
}

export default React.memo(AssetContainer)

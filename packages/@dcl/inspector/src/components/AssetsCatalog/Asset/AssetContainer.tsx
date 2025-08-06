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
  isLoading: boolean
}

// Cache to store fetched author data
const authorDataCache = new Map<string, AuthorData>()

// Constants
const DECENTRALAND_FOUNDATION_KEY = 'decentraland foundation'
const DECENTRALAND_FOUNDATION_DATA: AuthorData = {
  name: 'Decentraland Foundation',
  avatar: 'https://decentraland.org/images/logo.png',
  isLoading: false
}

const EMPTY_AUTHOR_DATA: AuthorData = {
  name: null,
  avatar: null,
  isLoading: false
}

const createAuthorData = (name: string | null, avatar: string | null): AuthorData => ({
  name,
  avatar,
  isLoading: false
})

const getCachedAuthorData = (authorKey: string): AuthorData | undefined => {
  return authorDataCache.get(authorKey)
}

const setCachedAuthorData = (authorKey: string, data: AuthorData): void => {
  authorDataCache.set(authorKey, data)
}

const useAuthorData = (author: string | null): AuthorData => {
  const [state, setState] = useState<AuthorData>(() => {
    if (!author) return EMPTY_AUTHOR_DATA

    const authorKey = author.toLowerCase()
    return getCachedAuthorData(authorKey) || EMPTY_AUTHOR_DATA
  })

  const config = getConfig()

  useEffect(() => {
    if (!author) {
      setState(EMPTY_AUTHOR_DATA)
      return
    }

    const authorKey = author.toLowerCase()
    const cachedData = getCachedAuthorData(authorKey)

    if (cachedData) {
      setState(cachedData)
      return
    }

    if (authorKey === DECENTRALAND_FOUNDATION_KEY.toLowerCase()) {
      setCachedAuthorData(authorKey, DECENTRALAND_FOUNDATION_DATA)
      setState(DECENTRALAND_FOUNDATION_DATA)
      return
    }

    setState({ ...EMPTY_AUTHOR_DATA, isLoading: true })

    const fetchAuthor = async () => {
      try {
        const req = await fetch(`${config.catalystBaseUrl}/lambdas/profiles`, {
          method: 'POST',
          body: JSON.stringify({ ids: [authorKey] })
        })

        if (!req.ok) {
          throw new Error('Failed to fetch author data')
        }

        const data = (await req.json()) as Array<{
          avatars: Array<{
            hasClaimedName: boolean
            name: string
            avatar: { snapshots: { face256: string } }
          }>
        }>

        const profile = data[0]?.avatars[0]
        const authorData = profile
          ? createAuthorData(profile.name, profile.avatar.snapshots.face256)
          : EMPTY_AUTHOR_DATA

        setCachedAuthorData(authorKey, authorData)
        setState(authorData)
      } catch {
        setCachedAuthorData(authorKey, EMPTY_AUTHOR_DATA)
        setState(EMPTY_AUTHOR_DATA)
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
      {imgSrc && <img src={imgSrc} alt={asset.name} className="SmartItemTooltipPreviewImage" loading="lazy" />}

      {(asset.description || asset.author) && (
        <div className="SmartItemTooltipText">
          {asset.description && <div className="SmartItemTooltipDescription">{asset.description}</div>}

          {asset.author && (
            <div className="SmartItemTooltipAuthor">
              <span>Created by</span>{' '}
              {author?.avatar && <img src={author.avatar} height={16} width={16} loading="lazy" />}
              {author?.name || asset.author}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SmartItemTooltip: React.FC<{ asset: AssetType }> = ({ asset }) => {
  const author = useAuthorData(asset.author || null)
  const hasTooltipContent = asset.description || asset.author || 'preview.png' in asset.contents
  const isAuthorLoading = asset.author && author.isLoading

  if (!hasTooltipContent || isAuthorLoading) {
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

function getLink(path) {
  for (const link of document.getElementsByTagName("link")) {
    const url = new URL(link.href)
    if (url.host === location.host && url.pathname === path) {
      return link
    }
  }
  return null
}

new EventSource('/esbuild').addEventListener('change', e => {
  const { added, removed, updated } = JSON.parse(e.data)

  // hot-reload css
  if (!added.length && !removed.length && updated.length > 0 && updated.every(path => path.includes('.css'))) {
    let didUpdate = false
    for (const path of updated) {
      const link = getLink(path)
      if (link) {
        const next = link.cloneNode()
        next.href = path + '?' + Math.random().toString(36).slice(2)
        next.onload = () => link.remove()
        link.parentNode.insertBefore(next, link.nextSibling)
        didUpdate = true
      }
    }
    if (didUpdate) return
  }

  // live-reload js
  location.reload()
})
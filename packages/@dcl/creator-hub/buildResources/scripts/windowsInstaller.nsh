!macro customInstall
  ; Clean up old shortcuts
  Delete "$DESKTOP\Decentraland Creator Hub.lnk"
  Delete "$SMPROGRAMS\Decentraland Creator Hub.lnk"

  ; Create Desktop Shortcut
  CreateShortCut "$DESKTOP\Decentraland Creator Hub.lnk" "$INSTDIR\Decentraland Creator Hub.exe" "" "$INSTDIR\Decentraland Creator Hub.exe" 0

  ; Create Start Menu Shortcut
  CreateShortCut "$SMPROGRAMS\Decentraland Creator Hub.lnk" "$INSTDIR\Decentraland Creator Hub.exe" "" "$INSTDIR\Decentraland Creator Hub.exe" 0
!macroend

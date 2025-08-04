import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, styled, Typography } from 'decentraland-ui2';
import { Atlas } from 'decentraland-ui2/dist/components/Atlas/Atlas';
import type { SceneParcels } from '@dcl/schemas';

import { useSelector } from '#store';

import { DEPLOY_URLS } from '/@/lib/deploy';
import type { Project } from '/shared/types/projects';

import { t } from '/@/modules/store/translation/utils';
import { selectors as landSelectors } from '/@/modules/store/land';
import { useEditor } from '/@/hooks/useEditor';
import { useWorkspace } from '/@/hooks/useWorkspace';
import { COLORS, type Coordinate } from './types';
import { type Props } from '../../types';
import { PublishModal } from '../../PublishModal';

function parseCoords(coords: string) {
  return coords.split(',').map(coord => parseInt(coord, 10)) as [number, number];
}
function calculateParcels(project: Project, point: Coordinate): Coordinate[] {
  const [baseX, baseY] = parseCoords(project.scene.base);
  return project.scene.parcels.map(parcel => {
    const [x, y] = parseCoords(parcel);
    return { x: x - baseX + point.x, y: y - baseY + point.y };
  });
}

const PublishToLandModal = styled(PublishModal)({
  '& > .MuiPaper-root > .MuiBox-root:last-child': {
    padding: 0,
  },
});

export function PublishToLand(props: Props) {
  const { project, publishScene } = useEditor();
  const { updateProject, updateSceneJson } = useWorkspace();
  const tiles = useSelector(state => state.land.tiles);
  const landTiles = useSelector(state => landSelectors.getLandTiles(state.land));
  const [hover, setHover] = useState<Coordinate>({ x: 0, y: 0 });
  const [placement, setPlacement] = useState<Coordinate | null>(null);
  const [initialPlacement, setInitialPlacement] = useState<Coordinate | null>(null);
  const [didAutoPlace, setDidAutoPlace] = useState(false);

  if (!project) return null;

  // Memoize the project parcels centered around the hover position
  const projectParcels = useMemo(() => calculateParcels(project, hover), [project, hover]);

  const handleNext = useCallback(async () => {
    if (!placement) return;
    const sceneUpdates: SceneParcels = {
      base: `${placement.x},${placement.y}`,
      parcels: calculateParcels(project, placement).map(({ x, y }) => `${x},${y}`),
    };
    await updateSceneJson(project.path, { scene: sceneUpdates, worldConfiguration: undefined });
    updateProject({
      ...project,
      scene: sceneUpdates,
      worldConfiguration: undefined, // Cannot deploy to a LAND with a world configuration
      updatedAt: Date.now(),
    });
    publishScene({
      target: import.meta.env.VITE_CATALYST_SERVER || DEPLOY_URLS.CATALYST_SERVER,
    });
    props.onStep('deploy');
  }, [placement, props.onStep]);

  const handleHover = useCallback((x: number, y: number) => {
    setHover({ x, y });
  }, []);

  const isHighlighted = useCallback(
    (x: number, y: number) =>
      !placement && projectParcels.some(parcel => parcel.x === x && parcel.y === y),
    [placement, projectParcels],
  );

  const isPlaced = useCallback(
    (x: number, y: number) => {
      if (!placement) return false;
      const placedParcels = calculateParcels(project, placement);
      return placedParcels.some(parcel => parcel.x === x && parcel.y === y);
    },
    [project, placement],
  );

  const isValid = useMemo(() => {
    return hover && projectParcels.every(({ x, y }) => !!landTiles[`${x},${y}`]);
  }, [landTiles, hover, projectParcels]);

  const strokeLayer = useCallback(
    (x: number, y: number) => {
      const placed = isPlaced(x, y);
      if (isHighlighted(x, y) || placed) {
        return {
          color: isValid || placed ? COLORS.selectedStroke : COLORS.indicatorStroke,
          scale: 1.5,
        };
      }
      return null;
    },
    [isHighlighted, isValid, isPlaced],
  );

  const highlightLayer = useCallback(
    (x: number, y: number) => {
      const placed = isPlaced(x, y);
      if (isHighlighted(x, y) || placed) {
        return { color: isValid || placed ? COLORS.selected : COLORS.indicator, scale: 1.2 };
      }
      return null;
    },
    [isHighlighted, isValid, isPlaced],
  );

  const ownedLayer = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      return landTiles[key] && landTiles[key].land.owner === tiles[key].owner
        ? { color: COLORS.freeParcel }
        : null;
    },
    [tiles, landTiles],
  );

  const handlePlacement = useCallback(
    (x: number, y: number) => {
      if (!isValid) return;
      setPlacement({ x, y });
    },
    [project, isValid],
  );

  const handleClearPlacement = useCallback(() => {
    setPlacement(null);
  }, []);

  // set initial placement
  useEffect(() => {
    if (!initialPlacement) {
      const { base, parcels } = project.scene;
      // use the base parcel if it's a valid coord
      if (base in landTiles && parcels.every(parcel => parcel in landTiles)) {
        const [x, y] = parseCoords(base);
        setInitialPlacement({ x, y });
      } else {
        // if the base parcel in the scene.json is not valid (ie. it is 0,0) then select the first coord of the available tiles as the initial placement
        const available = Object.keys(landTiles);
        if (available.length > 0) {
          const [x, y] = parseCoords(available[0]);
          setInitialPlacement({ x, y });
        }
      }
    }
  }, [initialPlacement, setInitialPlacement, project, landTiles]);

  // use initial placement if possible
  useEffect(() => {
    if (didAutoPlace) return;
    if (!placement && initialPlacement) {
      const initialPlacementParcels = calculateParcels(project, initialPlacement);
      if (initialPlacementParcels.every(({ x, y }) => !!landTiles[`${x},${y}`])) {
        setPlacement(initialPlacement);
        setDidAutoPlace(true);
      }
    }
  }, [placement, setPlacement, initialPlacement, didAutoPlace, setDidAutoPlace, landTiles]);

  return (
    <PublishToLandModal
      title={t('modal.publish_project.land.action')}
      size="large"
      {...props}
    >
      <Box>
        <Box
          height={480}
          style={{ backgroundColor: 'black' }}
        >
          {/* @ts-expect-error TODO: Update properties in UI2, making the not required `optional` */}
          <Atlas
            tiles={tiles}
            layers={[strokeLayer, highlightLayer, ownedLayer]}
            onHover={handleHover}
            onClick={handlePlacement}
            withZoomControls
            x={initialPlacement?.x as number}
            y={initialPlacement?.y as number}
          />
        </Box>
        <Box
          padding={2}
          paddingBottom={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box
            flex={1}
            display="flex"
            padding={1}
            mr={2}
            sx={{ border: '1px solid grey', borderRadius: '8px' }}
            justifyContent="center"
            alignItems="baseline"
            height={45}
          >
            <Typography variant="body1">
              {placement
                ? t('modal.publish_project.land.select_parcel.place_scene', {
                    coords: `${placement.x},${placement.y}`,
                  })
                : t('modal.publish_project.land.select_parcel.select_parcel')}
            </Typography>
            {placement && (
              <Button
                variant="text"
                size="small"
                onClick={handleClearPlacement}
                sx={{ marginLeft: 1, padding: 0 }}
              >
                {t('modal.publish_project.land.select_parcel.actions.reset')}
              </Button>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleNext}
            disabled={!placement}
            sx={{ height: '45px' }}
          >
            {t('modal.publish_project.land.select_parcel.actions.publish')}
          </Button>
        </Box>
      </Box>
    </PublishToLandModal>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from 'decentraland-ui2';

import { misc } from '#preload';

import type { Project } from '/shared/types/projects';

import { t } from '/@/modules/store/translation/utils';
import { useDeploy } from '/@/hooks/useDeploy';
import { useWorkspace } from '/@/hooks/useWorkspace';
import { addBase64ImagePrefix } from '/@/modules/image';

import { DeleteProject } from '../../Modals/DeleteProject';
import { ProjectCard } from '../../ProjectCard';

import type { Props } from './types';

export function Projects({ projects }: Props) {
  const navigate = useNavigate();

  if (!projects.length) return <NoScenes />;

  return (
    <>
      <div
        className="new-scene"
        onClick={() => navigate('/templates')}
      ></div>
      {projects.map(project => (
        <Project
          key={project.path}
          project={project}
        />
      ))}
    </>
  );
}

function Project({ project }: { project: Project }) {
  const { getDeployment } = useDeploy();
  const { runProject, duplicateProject, deleteProject, openFolder } = useWorkspace();
  const [open, setOpen] = useState(false);

  const deployment = getDeployment(project.path);
  const parcels = project.layout.cols * project.layout.rows;

  const handleClick = useCallback(() => {
    runProject(project);
  }, [project, runProject]);

  const handleDuplicateProject = useCallback(() => {
    duplicateProject(project);
  }, [project, duplicateProject]);

  const handleOpenFolder = useCallback(() => {
    openFolder(project.path);
  }, [project, openFolder]);

  const handleOpenModal = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpen(false);
  }, []);

  const handleDeleteProject = useCallback(() => {
    deleteProject(project);
    handleCloseModal();
  }, [project, deleteProject]);

  const dropdownOptions = [
    {
      text: t('scene_list.project_actions.duplicate_project'),
      handler: handleDuplicateProject,
    },
    {
      text: t('scene_list.project_actions.open_folder'),
      handler: handleOpenFolder,
    },
    {
      text: t('scene_list.project_actions.delete_project'),
      handler: handleOpenModal,
    },
  ];

  const thumbnailUrl = project.thumbnail ? addBase64ImagePrefix(project.thumbnail) : undefined;
  const content = (
    <>
      <i className="icon" /> {t('scene_list.parcel_count', { parcels })}
    </>
  );

  const publishedAt = useMemo(() => {
    if (deployment?.status === 'complete') return deployment?.lastUpdated;
    return project.publishedAt;
  }, [deployment, project.publishedAt]);

  return (
    <>
      <ProjectCard
        title={project.title}
        imageUrl={thumbnailUrl}
        dropdownOptions={dropdownOptions}
        content={content}
        publishedAt={publishedAt}
        status={project.status}
        onClick={handleClick}
      />
      <DeleteProject
        open={open}
        project={project}
        onClose={handleCloseModal}
        onSubmit={handleDeleteProject}
      />
    </>
  );
}

function NoScenesAnchor(content: string) {
  const handleClick = useCallback(
    () => misc.openExternal('https://docs.decentraland.org/creator/development-guide/sdk-101/'),
    [],
  );

  return (
    <a
      rel="noreferrer"
      target="_blank"
      href="https://docs.decentraland.org/creator/development-guide/sdk-101/"
      onClick={handleClick}
    >
      {content}
    </a>
  );
}

function NoScenes() {
  const navigate = useNavigate();

  return (
    <div className="no-scenes-container">
      <div className="no-scenes-card">
        <div className="no-scenes-card-text">
          <Typography
            variant="h3"
            className="no-scenes-title"
          >
            {t('scene_list.no_scenes.title')}
          </Typography>
          <span className="no-scenes-description">
            {t('scene_list.no_scenes.description', { a: NoScenesAnchor })}
          </span>
        </div>
        <div
          className="no-scenes-card-button"
          onClick={() => navigate('/templates')}
        ></div>
      </div>
    </div>
  );
}

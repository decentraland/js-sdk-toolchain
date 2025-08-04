import { useCallback, useMemo, useState } from 'react';
import cx from 'classnames';
import { ChainId } from '@dcl/schemas';
import { Typography, Checkbox } from 'decentraland-ui2';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { misc } from '#preload';

import type { File, Info, Status } from '/@/lib/deploy';

import { useAuth } from '/@/hooks/useAuth';
import { useWorkspace } from '/@/hooks/useWorkspace';
import { useEditor } from '/@/hooks/useEditor';
import { useSnackbar } from '/@/hooks/useSnackbar';
import { useDeploy } from '/@/hooks/useDeploy';

import { type Deployment } from '/@/modules/store/deployment/slice';
import { getInvalidFiles, MAX_FILE_SIZE_BYTES } from '/@/modules/store/deployment/utils';
import { t } from '/@/modules/store/translation/utils';
import { addBase64ImagePrefix } from '/@/modules/image';
import { REPORT_ISSUES_URL } from '/@/modules/utils';

import { PublishModal } from '/@/components/Modals/PublishProject/PublishModal';
import { ConnectedSteps } from '/@/components/Step';
import { Button } from '/@/components/Button';
import { Loader } from '/@/components/Loader';
import { ExpandMore } from '/@/components/ExpandMore';

import type { Step } from '/@/components/Step/types';
import type { Props } from '/@/components/Modals/PublishProject/types';

import './styles.css';

const MAX_FILE_PATH_LENGTH = 50;

function getPath(filename: string) {
  return filename.length > MAX_FILE_PATH_LENGTH
    ? `${filename.slice(0, MAX_FILE_PATH_LENGTH / 2)}...${filename.slice(
        -(MAX_FILE_PATH_LENGTH / 2),
      )}`
    : filename;
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

function getSize(size: number) {
  if (size < KB) {
    return `${size.toFixed(2)} B`;
  }
  if (size < MB) {
    return `${(size / KB).toFixed(2)} KB`;
  }
  if (size < GB) {
    return `${(size / MB).toFixed(2)} MB`;
  }
  return `${(size / GB).toFixed(2)} GB`;
}

export function Deploy(props: Props) {
  const { project } = props;
  const { chainId, wallet, avatar } = useAuth();
  const { updateProjectInfo } = useWorkspace();
  const { loadingPublish, publishError } = useEditor();
  const { getDeployment, executeDeployment } = useDeploy();
  const { pushCustom } = useSnackbar();
  const [showWarning, setShowWarning] = useState(false);
  const [skipWarning, setSkipWarning] = useState(project.info.skipPublishWarning ?? false);
  const deployment = getDeployment(project.path);

  const handlePublish = useCallback(() => {
    setShowWarning(false);
    updateProjectInfo(project.path, { skipPublishWarning: skipWarning }); // write skip warning flag
    executeDeployment(project.path);
  }, [skipWarning, project]);

  const handleBack = useCallback(() => {
    setShowWarning(false);
    setSkipWarning(false);
  }, []);

  // jump in
  const jumpInUrl = useMemo(() => {
    if (deployment?.info.isWorld && project.worldConfiguration) {
      return `decentraland://?realm=${project.worldConfiguration.name}`;
    } else {
      return `decentraland://?position=${project.scene.base}`;
    }
  }, [deployment, project]);

  const handleJumpIn = useCallback(() => {
    void misc.openExternal(jumpInUrl);
  }, [jumpInUrl]);

  const handleDeployRetry = useCallback(() => {
    props.onBack && props.onBack();
  }, []);

  const handleClose = useCallback(() => {
    // push snackbar notification if deploy is still pending when closing the modal
    if (deployment?.status === 'pending') {
      pushCustom({ type: 'deploy', path: project.path }, { duration: 0, requestId: project.path });
    }
    props.onClose();
  }, [deployment, pushCustom]);

  return (
    <PublishModal
      title={
        deployment
          ? deployment.info.isWorld
            ? t('modal.publish_project.deploy.world')
            : t('modal.publish_project.deploy.land')
          : loadingPublish
            ? t('modal.publish_project.deploy.loading')
            : t('modal.publish_project.deploy.error')
      }
      size="large"
      {...props}
      onClose={handleClose}
      onBack={props.disableGoBack || deployment?.status === 'complete' ? undefined : props.onBack}
    >
      <div className="Deploy">
        {showWarning ? (
          <div className="publish-warning">
            <div className="content">
              <div className="Warning" />
              <div className="message">
                {t('modal.publish_project.deploy.warning.message', {
                  ul: (child: string) => <ul>{child}</ul>,
                  li: (child: string) => <li>{child}</li>,
                })}
              </div>
            </div>
            <div className="actions">
              <label className="dont-show-again">
                <Checkbox
                  value={skipWarning}
                  onChange={() => setSkipWarning(!skipWarning)}
                />
                {t('modal.publish_project.deploy.warning.checkbox')}
              </label>
              <span className="buttons">
                <Button
                  color="secondary"
                  variant="outlined"
                  size="medium"
                  onClick={handleBack}
                >
                  {t('modal.publish_project.deploy.warning.back')}
                </Button>
                <Button
                  size="medium"
                  onClick={handlePublish}
                >
                  {t('modal.publish_project.deploy.warning.continue')}
                </Button>
              </span>
            </div>
          </div>
        ) : null}
        {loadingPublish ? (
          <Loader />
        ) : publishError ? (
          <div className="error">{publishError}</div>
        ) : !deployment ? null : (
          <>
            <div className="ethereum">
              <div className="chip network">
                {chainId === ChainId.ETHEREUM_MAINNET
                  ? t('modal.publish_project.deploy.ethereum.mainnet')
                  : t('modal.publish_project.deploy.ethereum.testnet')}
              </div>
              {wallet ? (
                <div className="chip address">
                  {wallet.slice(0, 6)}...{wallet.slice(-4)}
                </div>
              ) : null}
              {deployment.info.isWorld ? (
                avatar ? (
                  <div className="chip username">
                    {avatar.name}
                    {avatar.hasClaimedName ? <i className="verified"></i> : null}
                  </div>
                ) : null
              ) : (
                <div className="chip parcel">
                  <i className="pin"></i>
                  {deployment.info.baseParcel}
                </div>
              )}
            </div>
            <div className="scene">
              <div className="info">
                <div
                  className="thumbnail"
                  style={{ backgroundImage: `url(${addBase64ImagePrefix(project.thumbnail)})` }}
                />
                <div className="text">
                  <Typography variant="body1">{deployment.info.title}</Typography>
                  <Typography
                    variant="body2"
                    color="#A09BA8"
                  >
                    {deployment.info.description}
                  </Typography>
                </div>
              </div>
              {deployment.status === 'idle' && (
                <Idle
                  files={deployment.files}
                  error={deployment.error}
                  onClick={() => (skipWarning ? handlePublish() : setShowWarning(true))}
                />
              )}
              {(deployment.status === 'pending' || deployment.status === 'failed') && (
                <Deploying
                  deployment={deployment}
                  url={jumpInUrl}
                  onClick={handleJumpIn}
                  onRetry={handleDeployRetry}
                />
              )}
              {deployment.status === 'complete' && (
                <Success
                  info={deployment.info}
                  url={jumpInUrl}
                  onClick={handleJumpIn}
                />
              )}
            </div>
          </>
        )}
      </div>
    </PublishModal>
  );
}

type IdleProps = {
  files: File[];
  error?: Deployment['error'];
  onClick: () => void;
};

function Idle({ files, error, onClick }: IdleProps) {
  const invalidFiles = getInvalidFiles(files);
  const errorMessage =
    invalidFiles.length > 0
      ? t('modal.publish_project.deploy.deploying.errors.max_file_size_exceeded', {
          maxFileSizeInMb: MAX_FILE_SIZE_BYTES / 1e6,
        })
      : error?.message;

  return (
    <div className="files">
      <div className="filters">
        <div className="count">
          {t('modal.publish_project.deploy.files.count', { count: files.length })}
        </div>
        <div className="size">
          {t('modal.publish_project.deploy.files.size', {
            size: getSize(files.reduce((total, file) => total + file.size, 0)),
            b: (child: string) => (
              <b>
                {child}/{MAX_FILE_SIZE_BYTES / 1e6}MB
              </b>
            ),
          })}
        </div>
      </div>
      <div className="list">
        {files.map(file => (
          <div
            className={cx('file', { invalid: file.size > MAX_FILE_SIZE_BYTES })}
            key={file.name}
          >
            <div
              className="filename"
              title={file.name}
            >
              {getPath(file.name)}
            </div>
            <div className="size">{getSize(file.size)}</div>
          </div>
        ))}
      </div>
      <div className="actions">
        <p className="error">{errorMessage}</p>
        <Button
          size="large"
          onClick={onClick}
          disabled={!!error}
        >
          {t('modal.publish_project.deploy.files.publish')}
          <i className="deploy-icon" />
        </Button>
      </div>
    </div>
  );
}

type DeployingProps = {
  deployment: Deployment;
  url: string;
  onClick: () => void;
  onRetry: () => void;
};

function Deploying({ deployment, url, onClick, onRetry }: DeployingProps) {
  const { isDeployFinishing, deriveOverallStatus } = useDeploy();
  const { info, componentsStatus, error } = deployment;
  const isFinishing = isDeployFinishing(deployment);
  const overallStatus = deriveOverallStatus(deployment);

  const onReportIssue = useCallback(() => {
    void misc.openExternal(REPORT_ISSUES_URL);
  }, []);

  const getStepDescription = useCallback((status: Status) => {
    switch (status) {
      case 'pending':
        return t('modal.publish_project.deploy.deploying.step.loading');
      case 'failed':
        return t('modal.publish_project.deploy.deploying.step.failed');
      default:
        return undefined;
    }
  }, []);

  const steps: Step[] = useMemo(() => {
    const { catalyst, assetBundle, lods } = componentsStatus;
    const baseSteps = [
      {
        bulletText: '1',
        name: t('modal.publish_project.deploy.deploying.step.uploading'),
        description: getStepDescription(catalyst),
        state: catalyst,
      },
      {
        bulletText: '2',
        name: t('modal.publish_project.deploy.deploying.step.converting'),
        description: getStepDescription(assetBundle),
        state: assetBundle,
      },
    ];

    // Only add LODs step for non-world deployments
    if (!info.isWorld) {
      baseSteps.push({
        bulletText: '3',
        name: t('modal.publish_project.deploy.deploying.step.optimizing'),
        description: getStepDescription(lods),
        state: lods,
      });
    }

    return baseSteps;
  }, [componentsStatus, getStepDescription, info.isWorld]);

  const title = useMemo(() => {
    if (overallStatus === 'failed') return t('modal.publish_project.deploy.deploying.failed');
    if (isFinishing) return t('modal.publish_project.deploy.deploying.finishing');
    return t('modal.publish_project.deploy.deploying.publish');
  }, [overallStatus, isFinishing]);

  return (
    <div className="Deploying">
      <div className="header">
        <div className="title">
          {overallStatus === 'failed' ? <div className="Warning" /> : <Loader />}
          <Typography variant="h5">{title}</Typography>
        </div>
        {overallStatus === 'failed' && !error && (
          <span>{t('modal.publish_project.deploy.deploying.try_again')}</span>
        )}
        {error && (
          <span className="error">
            {error.message}
            {error.cause && (
              <ExpandMore
                title={t('modal.publish_project.deploy.deploying.errors.details')}
                text={error.cause}
              />
            )}
          </span>
        )}
      </div>
      <ConnectedSteps steps={steps} />
      {overallStatus === 'failed' ? (
        <div className="actions">
          <Button
            size="large"
            variant="outlined"
            color="secondary"
            onClick={onReportIssue}
          >
            {t('modal.publish_project.deploy.deploying.actions.report_issue')}
          </Button>
          <Button
            size="large"
            onClick={onRetry}
          >
            {t('modal.publish_project.deploy.deploying.actions.retry')}
          </Button>
        </div>
      ) : isFinishing ? (
        <>
          <div className="jump">
            <JumpUrl
              inProgress
              info={info}
              url={url}
            />
          </div>
          <div className="actions">
            <Button
              size="large"
              onClick={onClick}
            >
              {t('modal.publish_project.deploy.success.jump_in')}
              <i className="jump-in-icon" />
            </Button>
          </div>
        </>
      ) : (
        <div className="info">
          <InfoOutlinedIcon />
          {t('modal.publish_project.deploy.deploying.info')}
        </div>
      )}
    </div>
  );
}

type SuccessProps = {
  info: Info;
  url: string;
  onClick: () => void;
};

function Success({ info, url, onClick }: SuccessProps) {
  return (
    <div className="Success">
      <div className="content">
        <i className="success-icon" />
        <div className="message">{t('modal.publish_project.deploy.success.message')}</div>
        <JumpUrl
          info={info}
          url={url}
        />
      </div>
      <div className="actions">
        <Button
          size="large"
          onClick={onClick}
        >
          {t('modal.publish_project.deploy.success.jump_in')}
          <i className="jump-in-icon" />
        </Button>
      </div>
    </div>
  );
}

function JumpUrl({ inProgress, info, url }: { inProgress?: boolean; info: Info; url: string }) {
  return (
    <div className="jump-in-url">
      {inProgress && <label>{t('modal.publish_project.deploy.success.in_progress')}</label>}
      <label>
        {t('modal.publish_project.deploy.success.url', {
          target: info.isWorld
            ? t('modal.publish_project.deploy.success.world')
            : t('modal.publish_project.deploy.success.land'),
        })}
      </label>
      <div className="url">
        {url}
        <i
          className="copy-icon"
          onClick={() => misc.copyToClipboard(url)}
        />
      </div>
    </div>
  );
}

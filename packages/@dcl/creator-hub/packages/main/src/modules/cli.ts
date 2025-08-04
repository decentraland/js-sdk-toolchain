import { join } from 'path';
import fs from 'fs/promises';
import log from 'electron-log/main';

import type { PreviewOptions } from '/shared/types/settings';
import { CLIENT_NOT_INSTALLED_ERROR } from '/shared/utils';
import type { DeployOptions } from '/shared/types/deploy';
import { dynamicImport } from '/shared/dynamic-import';

import { dclDeepLink, run, type Child } from './bin';
import { getAvailablePort } from './port';
import { getProjectId, track } from './analytics';
import { install } from './npm';
import { downloadGithubFolder } from './download-github-folder';

export type Preview = { child: Child; url: string; opts: PreviewOptions };

const previewCache: Map<string, Preview> = new Map();
export let deployServer: { stop: () => Promise<void> } | null = null;

export function getPreview(path: string) {
  return previewCache.get(path);
}

async function getEnv(path: string) {
  const projectId = await getProjectId(path);
  return {
    ANALYTICS_PROJECT_ID: projectId,
    ANALYTICS_APP_ID: 'creator-hub',
  };
}

export async function init(targetPath: string, repo: string): Promise<void> {
  if (!repo) {
    throw new Error('Repository URL is required');
  }

  // Extract owner and repo name from the GitHub URL
  const isGithubRepo = repo.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!isGithubRepo) {
    throw new Error('Invalid GitHub repository URL');
  }
  await downloadGithubFolder(repo, targetPath);
  track('Scene created', {
    projectType: 'github-repo',
    url: repo,
    project_id: await getProjectId(targetPath),
  });
}

export async function killPreview(path: string) {
  const preview = previewCache.get(path);
  const promise = preview?.child.kill().catch(() => {});
  previewCache.delete(path);
  await promise;
}

export async function killAllPreviews() {
  for (const path of previewCache.keys()) {
    await killPreview(path);
  }
  previewCache.clear(); // just to be sure...
}

type PreviewArguments = Omit<PreviewOptions, 'debugger'>;

const PREVIEW_OPTIONS_MAP: Record<keyof PreviewArguments, string> = {
  enableLandscapeTerrains: '--landscape-terrain-enabled',
  openNewInstance: '-n',
  skipAuthScreen: '--skip-auth-screen',
};

function generatePreviewArguments(opts: PreviewOptions) {
  opts.skipAuthScreen = true;
  const args: string[] = [];
  for (const key in opts) {
    const typedKey = key as keyof PreviewArguments;
    if (opts[typedKey] && typedKey in PREVIEW_OPTIONS_MAP) {
      args.push(PREVIEW_OPTIONS_MAP[typedKey]);
    }
  }
  return args;
}

function isPreviewRunning(preview?: Preview): preview is Preview {
  return !!(preview?.child.alive() && preview.url);
}

// This fn is for already created deep-link. Just to add or remove values to a generated deep-link
// decentraland://position=80,80&skip-auth-screen=true etc
function updateDeepLinkWithOpts(params: string, newOpts: PreviewOptions): string {
  try {
    const urlParams = new URLSearchParams(params);

    // for the deep-link we need to remove the starting `--`
    // decentraland://?skip-auth-screen=true
    const stripLeadingDashes = (option: string): string => {
      return option.replace(/^-+/, '');
    };

    const setOrDeleteParam = (key: string, value: any) => {
      if (value) {
        urlParams.set(stripLeadingDashes(key), 'true');
      } else {
        urlParams.delete(stripLeadingDashes(key));
      }
    };

    // We always want to skip the auth screen
    setOrDeleteParam(PREVIEW_OPTIONS_MAP.skipAuthScreen, true);
    setOrDeleteParam(PREVIEW_OPTIONS_MAP.enableLandscapeTerrains, newOpts.enableLandscapeTerrains);

    // this param is different from what we recieved from the CLI that the one that the launcher uses.
    setOrDeleteParam('open-deeplink-in-new-instance', newOpts.openNewInstance);

    return urlParams.toString();
  } catch (error) {
    return params;
  }
}

export async function start(
  path: string,
  opts: PreviewOptions & { retry?: boolean },
): Promise<string> {
  const { retry = true } = opts;
  const preview = previewCache.get(path);

  // If we have a preview running for this path open it
  if (isPreviewRunning(preview)) {
    // Check if options have changed and update the URL accordingly
    const updatedUrl = updateDeepLinkWithOpts(preview.url, opts);
    await dclDeepLink(updatedUrl);

    return path;
  }

  killPreview(path);

  try {
    const process = run('@dcl/sdk-commands', 'sdk-commands', {
      args: ['start', '--explorer-alpha', '--hub', ...generatePreviewArguments(opts)],
      cwd: path,
      workspace: path,
      env: await getEnv(path),
    });

    const dclLauncherURL = /decentraland:\/\/([^\s\n]*)/i;
    const resultLogs = await process.waitFor(dclLauncherURL, /CliError/i);

    // Check if the error indicates that Decentraland Desktop Client is not installed
    if (resultLogs.includes(CLIENT_NOT_INSTALLED_ERROR)) {
      throw new Error(CLIENT_NOT_INSTALLED_ERROR);
    }

    const url = resultLogs.match(dclLauncherURL)?.[1] ?? '';

    const preview = { child: process, url, opts };
    previewCache.set(path, preview);
    return path;
  } catch (error) {
    killPreview(path);
    if (retry) {
      log.info('[CLI] Something went wrong trying to start preview:', (error as Error).message);
      await install(path);
      return await start(path, { ...opts, retry: false });
    } else {
      throw error;
    }
  }
}

// ############################################################################################
// TODO: Remove this after a couple of months...
export async function legacyDeploy({
  path,
  target,
  targetContent,
}: DeployOptions): Promise<number> {
  if (deployServer) {
    await deployServer.stop();
  }
  const port = await getAvailablePort();
  const process = run('@dcl/sdk-commands', 'sdk-commands', {
    args: [
      'deploy',
      '--no-browser',
      '--port',
      port.toString(),
      ...(target ? ['--target', target] : []),
      ...(targetContent ? ['--target-content', targetContent] : []),
    ],
    cwd: path,
    env: await getEnv(path),
    workspace: path,
  });

  // App ready at
  await process.waitFor(/listening/i, /error:/i, { reject: 'stderr' });

  process.waitFor(/close the terminal/gi).then(() => process.kill());

  process.wait().catch(); // handle rejection of main promise to avoid warnings in console

  deployServer = { stop: () => process.kill() };

  return port;
}

async function shouldRunLegacyDeploy(path: string) {
  const file = await fs.readFile(
    join(path, 'node_modules', '@dcl/sdk-commands/dist/commands/deploy/index.js'),
  );
  return !file.includes('--programmatic');
}
// ############################################################################################

async function getComponents(path: string) {
  const filePath = join(path, 'node_modules', '@dcl/sdk-commands/dist/components/index.js');
  const { initComponents } = await dynamicImport(filePath);
  const components = await initComponents();
  return components;
}

async function runCommand(path: string, command: string, args: string[]) {
  const components = await getComponents(path);
  const filePath = join(path, 'node_modules', '@dcl/sdk-commands/dist/run-command.js');
  const { runSdkCommand } = await dynamicImport(filePath);
  return runSdkCommand(components, command, args);
}

export async function deploy({
  path,
  target,
  targetContent,
  language,
}: DeployOptions): Promise<number> {
  if (deployServer) {
    await deployServer.stop();
  }

  const isLegacyDeploy = await shouldRunLegacyDeploy(path);
  if (isLegacyDeploy) {
    log.info('[CLI] Running legacy deploy');
    return legacyDeploy({ path, target, targetContent });
  }

  const port = await getAvailablePort();

  const { stop } = await runCommand(path, 'deploy', [
    '--dir',
    path,
    '--no-browser',
    '--port',
    port.toString(),
    ...(target ? ['--target', target] : []),
    ...(targetContent ? ['--target-content', targetContent] : []),
    '--programmatic',
    ...(language ? ['--language', language] : []),
  ]);

  deployServer = { stop };

  return port;
}

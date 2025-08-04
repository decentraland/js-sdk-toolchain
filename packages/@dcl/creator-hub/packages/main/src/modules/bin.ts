import path from 'path';
import { promisify } from 'util';
import { exec as execSync } from 'child_process';
import log from 'electron-log/main';
import { utilityProcess, shell } from 'electron';
import treeKill from 'tree-kill';
import { future } from 'fp-future';
import isRunning from 'is-running';

import { ErrorBase } from '/shared/types/error';
import { createCircularBuffer } from '/shared/circular-buffer';

import { CLIENT_NOT_INSTALLED_ERROR } from '/shared/utils';
import { APP_UNPACKED_PATH, getBinPath } from './path';
import { setupNodeBinary } from './setup-node';
import { track } from './analytics';

// Get the current PATH value
function getPath() {
  return process.env.PATH || '';
}

// exec async
const exec = promisify(execSync);

const MAX_BUFFER_SIZE = 2048;

type Error = 'COMMAND_FAILED';

export class StreamError extends ErrorBase<Error> {
  constructor(
    type: Error,
    message: string,
    public stdout: Buffer,
    public stderr: Buffer,
  ) {
    super(type, message);
  }
}

export type StreamType = 'all' | 'stdout' | 'stderr';

export type EventOptions = {
  type?: StreamType;
  sanitize?: boolean;
};

export type Child = {
  pkg: string;
  bin: string;
  args: string[];
  cwd: string;
  process: Electron.UtilityProcess;
  on: (pattern: RegExp, handler: (data?: string) => void, opts?: EventOptions) => number;
  once: (pattern: RegExp, handler: (data?: string) => void, opts?: EventOptions) => number;
  off: (index: number) => void;
  wait: () => Promise<Buffer>;
  waitFor: (
    resolvePattern: RegExp,
    rejectPattern?: RegExp,
    opts?: { resolve?: StreamType; reject?: StreamType },
  ) => Promise<string>;
  kill: () => Promise<void>;
  alive: () => boolean;
  stdall: (opts?: EventOptions) => string[];
};

type Matcher = {
  pattern: RegExp;
  handler: (data: string) => void;
  enabled: boolean;
  opts?: EventOptions;
};

type RunOptions = {
  args?: string[]; // this are the arguments for the command
  cwd?: string; // this is the directory where the command should be executed, it defaults to the app path.
  env?: Record<string, string>; // this are the env vars that should be added to the command's env
  workspace?: string; // this is the path where the node_modules that should be used are located, it defaults to the app path.
};

/**
 * Runs a javascript bin script in a utility child process, provides helpers to wait for the process to finish, listen for outputs, etc
 * @param pkg The npm package
 * @param bin The command to run
 * @param options Options for the child process (args, cwd, env, workspace)
 * @returns Child
 */
export function run(pkg: string, bin: string, options: RunOptions = {}): Child {
  let isKilling = false;
  let alive = true;

  const promise = future<Awaited<ReturnType<Child['wait']>>>();
  const matchers: Matcher[] = [];

  const { workspace = APP_UNPACKED_PATH, cwd = APP_UNPACKED_PATH, args = [], env = {} } = options;

  const binPath = getBinPath(pkg, bin, workspace);

  const stdout = createCircularBuffer<Uint8Array>(MAX_BUFFER_SIZE);
  const stderr = createCircularBuffer<Uint8Array>(MAX_BUFFER_SIZE);
  const stdall = createCircularBuffer<Uint8Array>(MAX_BUFFER_SIZE); // ordered buffer of stdout and stderr

  const forked = utilityProcess.fork(binPath, [...args], {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      ...env,
      PATH: getPath(),
    },
  });

  const cleanup = () => {
    for (const matcher of matchers) {
      matcher.enabled = false;
    }
    forked.stdout?.removeAllListeners('data');
    forked.stderr?.removeAllListeners('data');
    stdout.clear();
    stderr.clear();
    stdall.clear();
    matchers.length = 0;
  };

  forked.stdout!.on('data', (data: Buffer) => {
    handleData(data, matchers, 'stdout');
    stdout.push(Uint8Array.from(data));
    stdall.push(Uint8Array.from(data));
  });

  forked.stderr!.on('data', (data: Buffer) => {
    handleData(data, matchers, 'stderr');
    stderr.push(Uint8Array.from(data));
    stdall.push(Uint8Array.from(data));
  });

  const ready = future<void>();

  const name = `${bin} ${args.join(' ')}`.trim();
  forked.on('spawn', () => {
    log.info(
      `[UtilityProcess] Running "${name}" using bin=${binPath} with pid=${forked.pid} in ${cwd}`,
    );
    ready.resolve();
  });

  forked.on('exit', code => {
    if (!alive) return;
    alive = false;
    const stdoutBuf = Buffer.concat(stdout.getAll());
    log.info(
      `[UtilityProcess] Exiting "${name}" with pid=${forked.pid} and exit code=${code || 0}`,
    );
    if (code !== 0 && code !== null) {
      const stderrBuf = Buffer.concat(stderr.getAll());
      promise.reject(
        new StreamError(
          'COMMAND_FAILED',
          `Error: process "${name}" with pid=${forked.pid} exited with code=${code}`,
          stdoutBuf,
          stderrBuf,
        ),
      );
    } else {
      promise.resolve(stdoutBuf);
    }
    cleanup();
  });

  const child: Child = {
    pkg,
    bin,
    args,
    cwd,
    process: forked,
    stdall: (opts: EventOptions = {}) => {
      const out: string[] = [];
      for (const buf of stdall.getAllIterator()) {
        const data = Buffer.from(buf).toString('utf8');
        out.push(processData(data, opts));
      }
      return out;
    },
    on: (pattern, handler, opts = {}) => {
      if (alive) {
        return (
          matchers.push({
            pattern,
            handler,
            enabled: true,
            opts: {
              type: opts.type ?? 'all',
              sanitize: opts.sanitize ?? true,
            },
          }) - 1
        );
      }
      throw new Error('Process has been killed');
    },
    once: (pattern, handler, opts = {}) => {
      const index = child.on(
        pattern,
        data => {
          handler(data);
          child.off(index);
        },
        opts,
      );
      return index;
    },
    off: index => {
      if (matchers[index]) {
        matchers[index].enabled = false;
      }
    },
    wait: () => promise,
    waitFor: (resolvePattern, rejectPattern, opts) =>
      new Promise((resolve, reject) => {
        child.once(resolvePattern, data => resolve(data!), { type: opts?.resolve });
        if (rejectPattern) {
          child.once(rejectPattern, data => reject(new Error(data)), { type: opts?.reject });
        }
      }),
    kill: async () => {
      await ready;
      const pid = forked.pid!;

      // if child is being killed or already killed then return
      if (isKilling || !alive) return;
      isKilling = true;
      log.info(`[UtilityProcess] Killing process "${name}" with pid=${pid}...`);

      // create promise to kill child
      const killPromise = future<void>();

      // kill child gracefully
      treeKill(pid);

      // child successfully killed
      const die = (force: boolean = false) => {
        isKilling = false;
        alive = false;
        cleanup();
        if (force) {
          log.info(`[UtilityProcess] Process "${name}" with pid=${pid} forcefully killed`);
          treeKill(pid!, 'SIGKILL');
        } else {
          log.info(`[UtilityProcess] Process "${name}" with pid=${pid} gracefully killed`);
        }
        clearInterval(interval);
        clearTimeout(timeout);
        killPromise.resolve();
      };

      // interval to check if child still running and flag it as dead when is not running anymore
      const interval = setInterval(() => {
        if (!pid || !isRunning(pid)) {
          die();
        }
      }, 100);

      // timeout to stop checking if child still running, kill it with fire
      const timeout = setTimeout(() => {
        if (alive) {
          die(true);
        }
      }, 5000);

      // return promise
      return killPromise;
    },
    alive: () => alive,
  };

  return child;
}

export async function install() {
  setupNodeBinary();
}

async function handleData(buffer: Buffer, matchers: Matcher[], type: StreamType) {
  const data = buffer.toString('utf8');
  log.info(`[UtilityProcess] ${data}`); // pipe data to console
  for (const { pattern, handler, enabled, opts } of matchers) {
    if (!enabled) continue;
    if (opts?.type !== 'all' && opts?.type !== type) continue;
    pattern.lastIndex = 0; // reset regexp
    if (pattern.test(data)) {
      handler(processData(data, opts));
    }
  }
}

function processData(data: string, opts: EventOptions | undefined) {
  const { sanitize = true } = opts ?? {};
  // remove control characters from data
  const text = sanitize
    ? data.replace(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        '',
      )
    : data;
  return text;
}
export async function dclDeepLink(deepLink: string) {
  const command = process.platform === 'win32' ? 'start' : 'open';
  try {
    await exec(`${command} decentraland://"${deepLink}"`);
  } catch (e) {
    throw new Error(CLIENT_NOT_INSTALLED_ERROR);
  }
}

export async function code(_path: string) {
  const normalizedPath = path.normalize(_path);
  try {
    await exec(`code "${normalizedPath}"`, { env: { ...process.env, PATH: getPath() } });
    await track('Open Code', undefined);
  } catch (_) {
    const error = await shell.openPath(normalizedPath);
    if (error) {
      throw new Error(error);
    }
  }
}

import { useCallback, useMemo, useState } from 'react';
import { Initial } from './steps/Initial';
import { AlternativeServers } from './steps/AlternativeServers';
import { PublishToWorld } from './steps/PublishToWorld';
import { PublishToLand } from './steps/PublishToLand';
import { Deploy } from './steps/Deploy';

import type { Props, Step } from './types';

export function PublishProject({
  open,
  project,
  onClose,
  initialStep = 'initial',
  disableGoBack = false,
}: Omit<Props, 'onStep'>) {
  const [history, setHistory] = useState<Step[]>([]);
  const step = useMemo<Step>(
    () => (history.length > 0 ? history[history.length - 1] : initialStep),
    [history, initialStep],
  );

  const handleClose = useCallback(() => {
    setHistory([]);
    onClose();
  }, [setHistory, onClose]);

  const handleBack = useCallback(() => {
    setHistory(history => (history.length > 0 ? history.slice(0, -1) : []));
  }, [history, setHistory]);

  const handleStep = useCallback(
    (newStep: Step) => {
      setHistory(history => [...history, newStep]);
    },
    [setHistory],
  );

  const props: Props = {
    open,
    project,
    disableGoBack,
    onClose: handleClose,
    onBack: disableGoBack ? undefined : handleBack,
    onStep: handleStep,
  };

  return (
    <>
      {step === 'initial' && <Initial {...props} />}
      {step === 'alternative-servers' && <AlternativeServers {...props} />}
      {step === 'publish-to-land' && <PublishToLand {...props} />}
      {step === 'publish-to-world' && <PublishToWorld {...props} />}
      {step === 'deploy' && <Deploy {...props} />}
    </>
  );
}

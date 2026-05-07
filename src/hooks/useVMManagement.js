import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Hook for VM lifecycle management via Cloud Functions.
 * All functions are authenticated — uses the current user's Firebase token.
 */
export function useVMManagement() {
  const sendAgentCommand = async (vmId, command) => {
    const fn = httpsCallable(functions, 'sendAgentCommand');
    const result = await fn({ vmId, command });
    return result.data;
  };

  const startVM = async (vmId) => {
    const fn = httpsCallable(functions, 'startVM');
    const result = await fn({ vmId });
    return result.data;
  };

  const stopVM = async (vmId) => {
    const fn = httpsCallable(functions, 'stopVM');
    const result = await fn({ vmId });
    return result.data;
  };

  const restartVM = async (vmId) => {
    const fn = httpsCallable(functions, 'restartVM');
    const result = await fn({ vmId });
    return result.data;
  };

  const deleteVM = async (vmId) => {
    const fn = httpsCallable(functions, 'deleteVM');
    const result = await fn({ vmId, confirm: true });
    return result.data;
  };

  return {
    // Agent commands (any provider — works via Firestore)
    updateAgent: (vmId) => sendAgentCommand(vmId, 'update'),
    restartAgent: (vmId) => sendAgentCommand(vmId, 'restart'),

    // Azure VM lifecycle (Cloud Functions → Azure SDK)
    startVM,
    stopVM,
    restartVM,
    deleteVM,
  };
}

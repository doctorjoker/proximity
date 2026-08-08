import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDeviceCapabilities } from '../services/cpeCapabilitiesApi';

export default function useDeviceCapabilities(deviceId) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    try {
      const data = await getDeviceCapabilities(deviceId, controller.signal);
      setPayload(data);
    } catch (exc) {
      if (exc?.name !== 'AbortError') {
        setError(exc?.message || 'Capability Framework non disponibile');
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [deviceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const capabilities = payload?.capabilities || {};

  const api = useMemo(() => ({
    payload,
    profile: payload?.profile || null,
    resolution: payload?.resolution || 'UNRESOLVED',
    qualificationStatus: payload?.qualification_status || 'UNQUALIFIED',
    capabilities,
    supportedCodes: payload?.supported || [],
    unsupportedCodes: payload?.unsupported || [],
    loading,
    error,
    refresh,
    get(code) {
      return capabilities?.[code] || null;
    },
    supports(code) {
      const capability = capabilities?.[code];
      return Boolean(capability?.qualified && capability?.supported);
    },
    isQualified(code) {
      return Boolean(capabilities?.[code]?.qualified);
    },
    reason(code) {
      return capabilities?.[code]?.reason || null;
    },
  }), [payload, capabilities, loading, error, refresh]);

  return api;
}

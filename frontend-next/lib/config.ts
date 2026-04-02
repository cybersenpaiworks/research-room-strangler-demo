export const DEFAULT_SESSION_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_SESSION_ID ?? '1');

export const getGatewayBaseUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
};

export const getSocketPath = (): string => {
  const configuredPath = process.env.NEXT_PUBLIC_SOCKET_PATH?.trim();

  if (!configuredPath) {
    return '/socket.io';
  }

  return configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`;
};

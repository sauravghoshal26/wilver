export type AuthLink = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  type?: string;
  error?: string;
};

export function parseAuthLink(url: string): AuthLink {
  const parsed = new URL(url);
  const query = new URLSearchParams(parsed.search);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const value = (key: string) => hash.get(key) ?? query.get(key) ?? undefined;
  return {
    accessToken: value('access_token'),
    refreshToken: value('refresh_token'),
    code: value('code'),
    type: value('type'),
    error: value('error_description') ?? value('error'),
  };
}

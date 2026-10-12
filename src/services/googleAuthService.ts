export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  user: GoogleUserProfile | null;
}

const TOKEN_STORAGE_KEY = 'app_asistencia_google_token_v1';
const USER_STORAGE_KEY = 'app_asistencia_google_user_v1';
const CLIENT_ID_STORAGE_KEY = 'app_asistencia_google_client_id_v1';

// Default / fallback client ID from env or local storage
export const DEFAULT_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

class GoogleAuthService {
  private state: GoogleAuthState = {
    isAuthenticated: false,
    accessToken: null,
    expiresAt: null,
    user: null,
  };

  private listeners: Array<(state: GoogleAuthState) => void> = [];

  constructor() {
    this.loadPersistedAuth();
  }

  private loadPersistedAuth() {
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedToken) {
        const parsed = JSON.parse(savedToken);
        if (parsed.accessToken && parsed.expiresAt > Date.now()) {
          this.state = {
            isAuthenticated: true,
            accessToken: parsed.accessToken,
            expiresAt: parsed.expiresAt,
            user: savedUser ? JSON.parse(savedUser) : null,
          };
        } else {
          this.signOut();
        }
      }
    } catch (e) {
      console.warn('Error loading persisted Google auth', e);
    }
  }

  public getClientId(): string {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY) || DEFAULT_CLIENT_ID;
  }

  public setClientId(clientId: string): void {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
  }

  public getState(): GoogleAuthState {
    return this.state;
  }

  public subscribe(listener: (state: GoogleAuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  public async signIn(customClientId?: string): Promise<string> {
    const clientId = customClientId || this.getClientId();
    if (!clientId) {
      throw new Error(
        'Falta el Google Client ID. Configúralo en Ajustes para iniciar sesión con Google.'
      );
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error(
        'El SDK de Google no está disponible todavía. Comprueba tu conexión a internet.'
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(`Error de Google: ${response.error}`));
              return;
            }

            const accessToken = response.access_token;
            const expiresIn = (parseInt(response.expires_in, 10) || 3600) * 1000;
            const expiresAt = Date.now() + expiresIn;

            localStorage.setItem(
              TOKEN_STORAGE_KEY,
              JSON.stringify({ accessToken, expiresAt })
            );

            // Fetch user info
            let user: GoogleUserProfile | null = null;
            try {
              const userRes = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              if (userRes.ok) {
                user = await userRes.json();
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
              }
            } catch (err) {
              console.warn('Could not fetch user profile', err);
            }

            this.state = {
              isAuthenticated: true,
              accessToken,
              expiresAt,
              user,
            };

            this.notify();
            resolve(accessToken);
          },
        });

        client.requestAccessToken();
      } catch (err: any) {
        reject(err);
      }
    });
  }

  public signOut(): void {
    if (this.state.accessToken && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(this.state.accessToken, () => {});
      } catch (e) {
        // ignore
      }
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    this.state = {
      isAuthenticated: false,
      accessToken: null,
      expiresAt: null,
      user: null,
    };

    this.notify();
  }
}

export const googleAuthService = new GoogleAuthService();

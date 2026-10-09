import * as SecureStore from 'expo-secure-store';

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};

export async function saveAuthToken(token: string) {
  await SecureStore.setItemAsync(KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export async function saveUserData(user: unknown) {
  await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.USER_DATA);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function clearAuthData() {
  await Promise.all([SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN), SecureStore.deleteItemAsync(KEYS.USER_DATA)]);
}

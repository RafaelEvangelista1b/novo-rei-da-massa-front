import { Preferences } from '@capacitor/preferences';

function reportStorageError(operation, error) {
  console.warn('Falha ao ' + operation + ' a sessão de autenticação.', error);
}

// O SDK do Supabase usa este adaptador como seu único armazenamento de sessão.
// Preferences usa armazenamento nativo no Android/iOS e fallback web no navegador.
export const capacitorSessionStorage = {
  async getItem(key) {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      reportStorageError('recuperar', error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      reportStorageError('salvar', error);
    }
  },

  async removeItem(key) {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      reportStorageError('remover', error);
    }
  },
};
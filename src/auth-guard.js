(function protectKitchenPage() {
  const client = window.reiSupabase;
  let redirecting = false;

  function goToLogin() {
    if (redirecting) return;
    redirecting = true;
    sessionStorage.setItem('rei.auth.returnTo', 'cozinha.html');
    window.location.replace('./admin.html');
  }

  window.reiAuthLogout = async function logoutFromKitchen() {
    if (!client) return goToLogin();
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch {
      window.alert('Não foi possível encerrar a sessão. Tente novamente.');
      return;
    }
    goToLogin();
  };

  if (!client) {
    window.reiAuthGuardReady = Promise.resolve(false);
    goToLogin();
    return;
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    if (!session || session.user?.app_metadata?.role !== 'admin') goToLogin();
  });
  window.addEventListener('pagehide', () => subscription.unsubscribe(), { once: true });

  window.reiAuthGuardReady = client.auth.getSession().then(({ data, error }) => {
    const allowed = !error && data?.session?.user?.app_metadata?.role === 'admin';
    if (allowed) return true;
    goToLogin();
    return false;
  }).catch(() => {
    goToLogin();
    return false;
  });
})();

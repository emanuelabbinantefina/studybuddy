import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

// guard di autenticazione: blocca l'accesso alle pagine protette se l'utente non è loggato.
// angular lo esegue automaticamente prima di navigare verso una rotta protetta.

// se non sei loggato ti manda al login
function redirectToLogin(): UrlTree {
  const router = inject(Router);
  return router.createUrlTree(['/login']);
}

// guard per le rotte principali (es. /tabs)
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isLoggedIn()) {
    return true;
  }

  return redirectToLogin();
};

// guard per le rotte figlie (es. /tabs/home, /tabs/planner, ecc.)
// funziona uguale al precedente ma si applica ai figli della rotta
export const authChildGuard: CanActivateChildFn = () => {
  const auth = inject(AuthService);

  if (auth.isLoggedIn()) {
    return true;
  }

  return redirectToLogin();
};

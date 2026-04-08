import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

function redirectToLogin(): UrlTree {
  const router = inject(Router);
  return router.createUrlTree(['/login']);
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isLoggedIn()) {
    return true;
  }

  return redirectToLogin();
};

export const authChildGuard: CanActivateChildFn = () => {
  const auth = inject(AuthService);

  if (auth.isLoggedIn()) {
    return true;
  }

  return redirectToLogin();
};

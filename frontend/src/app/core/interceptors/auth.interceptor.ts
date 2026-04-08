import { HttpInterceptorFn } from '@angular/common/http';
import { getAuthToken } from '../utils/session-storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getAuthToken();
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  
  return next(req);
};

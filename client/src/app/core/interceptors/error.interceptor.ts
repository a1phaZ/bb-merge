import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error) => {
      const body = error.error;
      const msg = error.status === 402 && body?.message
        ? body.message
        : (body?.error || error.statusText || 'Unknown error');
      snackBar.open(msg, 'Close', { duration: 5000, panelClass: 'error-snackbar' });
      return throwError(() => error);
    }),
  );
};

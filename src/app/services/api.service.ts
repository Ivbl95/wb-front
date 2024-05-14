import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl =
    'http://ch.sc-reports.vm.prod-6.cloud.el/api/queries/9/results.json?api_key=00jwYsh1ddNhK0CFU5rKYUILNBBAYzG9IZYFLK4e';

  constructor(private http: HttpClient) {}

  getTableData(): Observable<any> {
    return this.http
      .get<any>(this.apiUrl) // Используйте this.apiUrl без /data
      .pipe(catchError(this.handleError));
  }

  postData(data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .post<any>(this.apiUrl, data, { headers })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred', error);
    return throwError(
      () => new Error('Something bad happened; please try again later.')
    );
  }
}

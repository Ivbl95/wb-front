import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private url: string = 'http://ch.sc-reports.vm.prod-6.cloud.el/api/';

  constructor(private http: HttpClient) {}

  public getTableRows(): Observable<any> {
    const TableRowsUrl: string = 'queries/9/results.json?api_key=00jwYsh1ddNhK0CFU5rKYUILNBBAYzG9IZYFLK4e';
    return this.http.get<any>(`${this.url}${TableRowsUrl}`).pipe(catchError(this.handleError));
  }

  public getExpandedTableRows(id: string): Observable<any> {
    const data = { parameters: { id }, max_age: 1000 };
    const expandedTableRowsUrl: string = `queries/51/results?api_key=fobpGFSDPMK1ljL8YfvUD0Hy4e7WiINJvA9yHzBl`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json;charset=utf-8' });

    return this.http
      .post<any>(`${this.url}${expandedTableRowsUrl}`, data, { headers })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('Ошибка', error);
    return throwError(() => new Error('Ошибка.'));
  }
}

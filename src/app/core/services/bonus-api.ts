import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BonusCreated,
  BonusFilter,
  BonusListItem,
  BonusPayment,
  CreateBonusRequest,
  Employee,
} from '../models/bonus';
import { PagedResponse } from '../models/paged-response';

@Injectable({ providedIn: 'root' })
export class BonusApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Bonus`;

  getPaged(filter: BonusFilter, pageIndex: number, pageSize: number): Observable<PagedResponse<BonusListItem>> {
    let params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', pageSize);
    for (const [key, value] of Object.entries(filter)) {
      if (value !== null && value !== '') {
        params = params.set(key, value);
      }
    }
    return this.http.get<PagedResponse<BonusListItem>>(this.baseUrl, { params });
  }

  getEmployee(departmentCode: string, employeeNumber: number): Observable<Employee> {
    return this.http.get<Employee>(
      `${this.baseUrl}/employee/${encodeURIComponent(departmentCode)}/${employeeNumber}`,
    );
  }

  create(request: CreateBonusRequest): Observable<BonusCreated> {
    return this.http.post<BonusCreated>(this.baseUrl, request);
  }

  cancel(bonusId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${bonusId}/cancel`, null);
  }

  delete(bonusId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bonusId}`);
  }

  pay(bonusId: number): Observable<BonusPayment> {
    return this.http.post<BonusPayment>(`${this.baseUrl}/${bonusId}/pay`, null);
  }
}

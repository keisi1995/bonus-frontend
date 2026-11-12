import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { BonusFilter, BonusListItem } from '../../core/models/bonus';
import { BonusStates, BonusTypes, MasterStateCodes } from '../../core/models/catalog';
import { PagedResponse } from '../../core/models/paged-response';
import { BonusApi } from '../../core/services/bonus-api';
import { CatalogApi } from '../../core/services/catalog-api';
import { Notification } from '../../core/services/notification';
import { BonusFormModal } from './bonus-form-modal/bonus-form-modal';

const PAGE_SIZE = 10;

/** Pantalla de bonos de desempeño: filtros, listado paginado desde el servidor y acciones por fila. */
@Component({
  selector: 'app-bonuses',
  imports: [ReactiveFormsModule, DecimalPipe, BonusFormModal],
  templateUrl: './bonuses.html',
  styleUrl: './bonuses.css',
})
export class Bonuses {
  private readonly catalogApi = inject(CatalogApi);
  private readonly bonusApi = inject(BonusApi);
  private readonly notification = inject(Notification);

  protected readonly BonusTypes = BonusTypes;
  protected readonly departments = toSignal(this.catalogApi.getDepartments(), { initialValue: [] });
  protected readonly bonusStates = toSignal(this.catalogApi.getStates(MasterStateCodes.Bonus), { initialValue: [] });

  protected readonly filtersForm = inject(NonNullableFormBuilder).group({
    departmentCode: [''],
    employeeNumber: [null as number | null],
    period: [''],
    bonusStateCode: [''],
  });

  protected readonly page = signal<PagedResponse<BonusListItem> | null>(null);
  protected readonly loading = signal(false);
  protected readonly isModalOpen = signal(false);

  // Filtros con los que se hizo la última búsqueda: al cambiar de página se reutilizan,
  // aunque el usuario haya editado el formulario sin presionar Buscar.
  private appliedFilters: BonusFilter = this.filtersForm.getRawValue();
  private pageIndex = 1;

  constructor() {
    this.load();
  }

  protected search(): void {
    this.appliedFilters = this.filtersForm.getRawValue();
    this.pageIndex = 1;
    this.load();
  }

  protected clear(): void {
    this.filtersForm.reset();
    this.search();
  }

  protected goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.load();
  }

  protected isRegistered(bonus: BonusListItem): boolean {
    return bonus.bonusStateCode === BonusStates.Registered;
  }

  protected cancel(bonus: BonusListItem): void {
    this.runAction(bonus, 'anular', this.bonusApi.cancel(bonus.bonusId), 'Bono anulado.');
  }

  protected delete(bonus: BonusListItem): void {
    // Si se elimina la única fila de la última página, se retrocede una página.
    const isLastRowOfPage = this.page()?.data.length === 1 && this.pageIndex > 1;
    this.runAction(bonus, 'eliminar', this.bonusApi.delete(bonus.bonusId), 'Bono eliminado.', () => {
      if (isLastRowOfPage) this.pageIndex--;
    });
  }

  protected pay(bonus: BonusListItem): void {
    this.runAction(bonus, 'pagar', this.bonusApi.pay(bonus.bonusId), 'Bono pagado y distribuido por proyecto.');
  }

  protected onSaved(): void {
    this.isModalOpen.set(false);
    this.notification.show('success', 'Bono registrado.');
    this.search();
  }

  private runAction(
    bonus: BonusListItem,
    verb: string,
    request: Observable<unknown>,
    successMessage: string,
    beforeReload?: () => void,
  ): void {
    const label = `${bonus.departmentCode}-${bonus.employeeNumber} (${bonus.period})`;
    if (!confirm(`¿Seguro que deseas ${verb} el bono de ${label}?`)) return;

    // Los errores (409 u otros) ya los muestra el interceptor global.
    request.subscribe(() => {
      this.notification.show('success', successMessage);
      beforeReload?.();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.bonusApi
      .getPaged(this.appliedFilters, this.pageIndex, PAGE_SIZE)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((page) => this.page.set(page));
  }
}

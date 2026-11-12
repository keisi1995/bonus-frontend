import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { Employee } from '../../../core/models/bonus';
import { BonusTypes, Department } from '../../../core/models/catalog';
import { BonusApi } from '../../../core/services/bonus-api';
import { CatalogApi } from '../../../core/services/catalog-api';
import { calculateBonus } from '../../../core/utils/bonus-calculator';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mes actual en formato YYYY-MM (hora local). */
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Modal de registro: busca al empleado, captura el bono y muestra la vista previa del cálculo. */
@Component({
  selector: 'app-bonus-form-modal',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe],
  templateUrl: './bonus-form-modal.html',
  styleUrl: './bonus-form-modal.css',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class BonusFormModal {
  private readonly bonusApi = inject(BonusApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly departments = input.required<Department[]>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly BonusTypes = BonusTypes;
  protected readonly maxPeriod = currentPeriod();
  protected readonly bonusTypes = toSignal(this.catalogApi.getBonusTypes(), { initialValue: [] });
  protected readonly bonusReasons = toSignal(this.catalogApi.getBonusReasons(), { initialValue: [] });

  protected readonly employee = signal<Employee | null>(null);
  protected readonly searching = signal(false);
  protected readonly saving = signal(false);

  protected readonly searchForm = this.fb.group({
    departmentCode: ['', Validators.required],
    employeeNumber: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  protected readonly bonusForm = this.fb.group({
    period: [this.maxPeriod, [Validators.required, Validators.pattern(PERIOD_PATTERN), notAfter(this.maxPeriod)]],
    bonusTypeId: [BonusTypes.FixedAmount as number, Validators.required],
    bonusValue: [null as number | null, [Validators.required, (c: AbstractControl) => this.validateBonusValue(c)]],
    reasonCode: ['', Validators.required],
  });

  // valueChanges es un Observable; toSignal lo convierte en signal para usarlo en computed().
  private readonly bonusFormValue = toSignal(this.bonusForm.valueChanges, {
    initialValue: this.bonusForm.getRawValue(),
  });

  protected readonly isPercentage = computed(
    () => this.bonusFormValue().bonusTypeId === BonusTypes.SalaryPercentage,
  );

  protected readonly preview = computed(() => {
    const employee = this.employee();
    const { bonusTypeId, bonusValue } = this.bonusFormValue();
    if (!employee || bonusTypeId == null || bonusValue == null || bonusValue <= 0) return null;
    return calculateBonus(bonusTypeId, bonusValue, employee.monthlySalary, employee.taxRate);
  });

  constructor() {
    // Si cambian área o número, el empleado encontrado ya no corresponde.
    this.searchForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.employee.set(null));
    // El máximo permitido depende del tipo de bono: se revalida el valor al cambiar el tipo.
    this.bonusForm.controls.bonusTypeId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.bonusForm.controls.bonusValue.updateValueAndValidity());
  }

  protected searchEmployee(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const { departmentCode, employeeNumber } = this.searchForm.getRawValue();
    this.searching.set(true);
    this.bonusApi
      .getEmployee(departmentCode, employeeNumber!)
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe((employee) => {
        this.employee.set(employee);
        this.bonusForm.controls.bonusValue.updateValueAndValidity();
      });
  }

  protected save(): void {
    const employee = this.employee();
    if (!employee || this.bonusForm.invalid) {
      this.bonusForm.markAllAsTouched();
      return;
    }
    const { period, bonusTypeId, bonusValue, reasonCode } = this.bonusForm.getRawValue();
    this.saving.set(true);
    this.bonusApi
      .create({
        departmentCode: employee.departmentCode,
        employeeNumber: employee.employeeNumber,
        period,
        bonusTypeId,
        bonusValue: bonusValue!,
        reasonCode,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => this.saved.emit());
  }

  protected hasError(control: AbstractControl, error: string): boolean {
    return control.touched && control.hasError(error);
  }

  private validateBonusValue(control: AbstractControl<number | null>): ValidationErrors | null {
    const value = control.value;
    if (value == null) return null; // lo cubre Validators.required
    if (value <= 0) return { positive: true };
    if (!Number.isInteger(Number((value * 100).toPrecision(15)))) return { decimals: true };

    // Esta función también corre al crear el formulario, antes de que exista bonusForm.
    const isPercentage = this.bonusForm?.controls.bonusTypeId.value === BonusTypes.SalaryPercentage;
    if (isPercentage) return value > 100 ? { maxPercentage: true } : null;

    const salary = this.employee()?.monthlySalary;
    return salary != null && value > salary ? { maxSalary: { max: salary } } : null;
  }
}

/** Valida que un periodo YYYY-MM no sea posterior a maxPeriod. */
function notAfter(maxPeriod: string) {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    control.value && control.value > maxPeriod ? { futurePeriod: true } : null;
}

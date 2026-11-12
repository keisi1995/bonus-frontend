export interface BonusListItem {
  bonusId: number;
  bonusStateCode: string;
  bonusStateDescription: string;
  period: string;
  departmentCode: string;
  departmentName: string;
  employeeNumber: number;
  employeeFullName: string;
  bonusTypeId: number;
  bonusTypeDescription: string;
  bonusValue: number;
  reasonCode: string;
  reasonDescription: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
}

/** Filtros opcionales del listado; los vacíos no se envían a la API. */
export interface BonusFilter {
  departmentCode: string;
  employeeNumber: number | null;
  period: string;
  bonusStateCode: string;
}

export interface Employee {
  departmentCode: string;
  employeeNumber: number;
  fullName: string;
  hireDate: string;
  monthlySalary: number;
  taxRate: number;
}

export interface CreateBonusRequest {
  departmentCode: string;
  employeeNumber: number;
  period: string;
  bonusTypeId: number;
  bonusValue: number;
  reasonCode: string;
}

export interface BonusAmounts {
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
}

export interface BonusCreated extends BonusAmounts {
  bonusId: number;
}

export interface BonusPayment {
  bonusId: number;
  grossAmount: number;
  distributions: { projectName: string; hours: number; amount: number }[];
}

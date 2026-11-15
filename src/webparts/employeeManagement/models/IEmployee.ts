export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export const DEPARTMENTS: string[] = [
  'Engineering',
  'Human Resources',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Support'
];

export const STATUSES: EmployeeStatus[] = ['Active', 'On Leave', 'Inactive'];

/** Shape used inside the React app. */
export interface IEmployee {
  id?: number;
  fullName: string;
  employeeCode: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string; // ISO yyyy-mm-dd
  status: EmployeeStatus;
  modified?: string;
}

/** Raw shape returned by the SharePoint REST API. */
export interface ISPEmployeeItem {
  Id: number;
  Title: string;
  EmployeeCode: string;
  Email: string;
  Phone: string;
  Department: string;
  Designation: string;
  JoiningDate: string | null;
  EmployeeStatus: EmployeeStatus;
  Modified: string;
}

export const emptyEmployee = (): IEmployee => ({
  fullName: '',
  employeeCode: '',
  email: '',
  phone: '',
  department: DEPARTMENTS[0],
  designation: '',
  joiningDate: new Date().toISOString().substring(0, 10),
  status: 'Active'
});

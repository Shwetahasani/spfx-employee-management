import { EmployeeService } from '../services/EmployeeService';

export interface IEmployeeManagementProps {
  title: string;
  listName: string;
  pageSize: number;
  service: EmployeeService;
  isDarkTheme: boolean;
  currentUserDisplayName: string;
}

import styles from './EmployeeManagement.module.scss';
import { EmployeeStatus } from '../models/IEmployee';

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#0e4d5a',
  'Human Resources': '#7a4e8c',
  Finance: '#2f5d8a',
  Sales: '#a8442f',
  Marketing: '#b0567a',
  Operations: '#4f6b2e',
  Support: '#6b5a2e'
};

export const deptColor = (dept: string): string => DEPT_COLORS[dept] || '#5f6f78';

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('') || '?';

export const statusClass = (status: EmployeeStatus): string =>
  status === 'Active' ? styles.statusActive : status === 'On Leave' ? styles.statusOnLeave : styles.statusInactive;

export const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

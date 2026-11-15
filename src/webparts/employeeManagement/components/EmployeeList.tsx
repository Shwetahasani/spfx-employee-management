import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IColumn,
  SearchBox,
  Dropdown,
  IDropdownOption,
  IconButton,
  DefaultButton,
  PrimaryButton,
  Dialog,
  DialogType,
  DialogFooter
} from '@fluentui/react';
import styles from './EmployeeManagement.module.scss';
import { IEmployee, DEPARTMENTS, STATUSES } from '../models/IEmployee';
import { deptColor, initials, statusClass, formatDate } from './helpers';

export interface IEmployeeListProps {
  employees: IEmployee[];
  pageSize: number;
  onAdd: () => void;
  onEdit: (e: IEmployee) => void;
  onDelete: (e: IEmployee) => Promise<void>;
}

const ALL = '__all__';
type SortKey = keyof IEmployee;

const EmployeeList: React.FC<IEmployeeListProps> = ({ employees, pageSize, onAdd, onEdit, onDelete }) => {
  const [query, setQuery] = React.useState('');
  const [dept, setDept] = React.useState<string>(ALL);
  const [status, setStatus] = React.useState<string>(ALL);
  const [sortKey, setSortKey] = React.useState<SortKey>('fullName');
  const [sortDesc, setSortDesc] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [toDelete, setToDelete] = React.useState<IEmployee | undefined>(undefined);
  const [deleting, setDeleting] = React.useState(false);

  // Reset to the first page whenever the filters change.
  React.useEffect(() => setPage(0), [query, dept, status]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = employees.filter(e => {
      if (dept !== ALL && e.department !== dept) return false;
      if (status !== ALL && e.status !== status) return false;
      if (!q) return true;
      return [e.fullName, e.employeeCode, e.email, e.designation, e.phone]
        .some(v => (v || '').toLowerCase().indexOf(q) !== -1);
    });
    return rows.sort((a, b) => {
      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
  }, [employees, query, dept, status, sortKey, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const onColumnClick = (_: React.MouseEvent<HTMLElement>, col: IColumn): void => {
    const key = col.fieldName as SortKey;
    if (key === sortKey) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(false);
    }
  };

  const col = (key: SortKey, name: string, min: number, max: number, extra: Partial<IColumn> = {}): IColumn => ({
    key,
    fieldName: key,
    name,
    minWidth: min,
    maxWidth: max,
    isResizable: true,
    isSorted: sortKey === key,
    isSortedDescending: sortKey === key && sortDesc,
    onColumnClick,
    ...extra
  });

  const columns: IColumn[] = [
    col('fullName', 'Name', 200, 300, {
      onRender: (e: IEmployee) => (
        <div className={styles.nameCell}>
          <span className={styles.avatar} style={{ background: deptColor(e.department) }} aria-hidden="true">
            {initials(e.fullName)}
          </span>
          <span className={styles.nameText}>
            <strong>{e.fullName}</strong>
            <span>{e.email}</span>
          </span>
        </div>
      )
    }),
    col('employeeCode', 'Employee ID', 90, 110),
    col('department', 'Department', 110, 160),
    col('designation', 'Designation', 120, 200),
    col('joiningDate', 'Joined', 90, 120, { onRender: (e: IEmployee) => formatDate(e.joiningDate) }),
    col('status', 'Status', 80, 100, {
      onRender: (e: IEmployee) => <span className={`${styles.status} ${statusClass(e.status)}`}>{e.status}</span>
    }),
    {
      key: 'actions',
      name: 'Actions',
      isIconOnly: true,
      minWidth: 72,
      maxWidth: 72,
      onRender: (e: IEmployee) => (
        <div>
          <IconButton iconProps={{ iconName: 'Edit' }} title={`Edit ${e.fullName}`} ariaLabel={`Edit ${e.fullName}`} onClick={() => onEdit(e)} />
          <IconButton iconProps={{ iconName: 'Delete' }} title={`Delete ${e.fullName}`} ariaLabel={`Delete ${e.fullName}`} onClick={() => setToDelete(e)} />
        </div>
      )
    }
  ];

  const deptOptions: IDropdownOption[] = [{ key: ALL, text: 'All departments' }, ...DEPARTMENTS.map(d => ({ key: d, text: d }))];
  const statusOptions: IDropdownOption[] = [{ key: ALL, text: 'All statuses' }, ...STATUSES.map(s => ({ key: s, text: s }))];

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    setDeleting(true);
    await onDelete(toDelete);
    setDeleting(false);
    setToDelete(undefined);
  };

  const exportCsv = (): void => {
    const header = ['Employee ID', 'Full name', 'Email', 'Phone', 'Department', 'Designation', 'Joining date', 'Status'];
    const esc = (v: string): string => `"${(v || '').replace(/"/g, '""')}"`;
    const lines = filtered.map(e =>
      [e.employeeCode, e.fullName, e.email, e.phone, e.department, e.designation, e.joiningDate, e.status].map(esc).join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `employees-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (employees.length === 0) {
    return (
      <div className={styles.empty} style={{ marginTop: 16 }}>
        <h3>No employees yet</h3>
        <p>Add the first person to start building your directory.</p>
        <PrimaryButton iconProps={{ iconName: 'AddFriend' }} text="Add employee" onClick={onAdd} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className={styles.toolbar}>
        <SearchBox
          className={styles.search}
          placeholder="Search by name, ID, email or designation"
          value={query}
          onChange={(_, v) => setQuery(v || '')}
        />
        <Dropdown className={styles.filter} label="Department" options={deptOptions} selectedKey={dept} onChange={(_, o) => setDept(String(o?.key ?? ALL))} />
        <Dropdown className={styles.filter} label="Status" options={statusOptions} selectedKey={status} onChange={(_, o) => setStatus(String(o?.key ?? ALL))} />
        <DefaultButton iconProps={{ iconName: 'Download' }} text="Export CSV" onClick={exportCsv} disabled={filtered.length === 0} />
      </div>

      <p className={styles.resultCount} aria-live="polite">
        Showing {filtered.length} of {employees.length} employees
      </p>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <h3>No matches</h3>
          <p>Try a different search term or clear the filters.</p>
          <DefaultButton text="Clear filters" onClick={() => { setQuery(''); setDept(ALL); setStatus(ALL); }} />
        </div>
      ) : (
        <>
          <DetailsList
            items={pageRows}
            columns={columns}
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            setKey="employees"
            onItemInvoked={(e: IEmployee) => onEdit(e)}
          />
          <div className={styles.pager}>
            <span>Page {safePage + 1} of {pageCount}</span>
            <div>
              <IconButton iconProps={{ iconName: 'ChevronLeft' }} ariaLabel="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} />
              <IconButton iconProps={{ iconName: 'ChevronRight' }} ariaLabel="Next page" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} />
            </div>
          </div>
        </>
      )}

      <Dialog
        hidden={!toDelete}
        onDismiss={() => setToDelete(undefined)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete employee?',
          subText: toDelete ? `${toDelete.fullName} (${toDelete.employeeCode}) will be moved to the site recycle bin.` : ''
        }}
      >
        <DialogFooter>
          <PrimaryButton text={deleting ? 'Deleting…' : 'Delete'} disabled={deleting} onClick={confirmDelete} />
          <DefaultButton text="Cancel" onClick={() => setToDelete(undefined)} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default EmployeeList;

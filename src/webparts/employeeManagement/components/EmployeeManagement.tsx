import * as React from 'react';
import {
  Pivot,
  PivotItem,
  PrimaryButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import styles from './EmployeeManagement.module.scss';
import { IEmployeeManagementProps } from './IEmployeeManagementProps';
import { IEmployee } from '../models/IEmployee';
import EmployeeList from './EmployeeList';
import EmployeeForm from './EmployeeForm';
import Dashboard from './Dashboard';

type LoadState = 'loading' | 'ready' | 'missingList' | 'error';

const EmployeeManagement: React.FC<IEmployeeManagementProps> = props => {
  const { service, title, listName, pageSize } = props;

  const [state, setState] = React.useState<LoadState>('loading');
  const [employees, setEmployees] = React.useState<IEmployee[]>([]);
  const [error, setError] = React.useState<string>('');
  const [notice, setNotice] = React.useState<string>('');
  const [editing, setEditing] = React.useState<IEmployee | undefined>(undefined);
  const [formOpen, setFormOpen] = React.useState<boolean>(false);
  const [settingUp, setSettingUp] = React.useState<boolean>(false);

  const load = React.useCallback(async (): Promise<void> => {
    setState('loading');
    setError('');
    try {
      if (!(await service.listExists())) {
        setState('missingList');
        return;
      }
      setEmployees(await service.getAll());
      setState('ready');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, [service]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const setUpList = async (): Promise<void> => {
    setSettingUp(true);
    try {
      await service.ensureList();
      setNotice(`The "${listName}" list is ready. Add your first employee.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    } finally {
      setSettingUp(false);
    }
  };

  const openNew = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (emp: IEmployee): void => {
    setEditing(emp);
    setFormOpen(true);
  };

  const handleSaved = async (saved: IEmployee, isNew: boolean): Promise<void> => {
    setFormOpen(false);
    setNotice(isNew ? `${saved.fullName} added.` : `${saved.fullName} saved.`);
    setEmployees(await service.getAll());
  };

  const handleDelete = async (emp: IEmployee): Promise<void> => {
    try {
      await service.remove(emp.id!);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      setNotice(`${emp.fullName} deleted.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{title || 'Employee Management'}</h2>
          <p className={styles.subtitle}>
            {state === 'ready' ? `${employees.length} people in ${listName}` : `Stored in the "${listName}" list`}
          </p>
        </div>
        {state === 'ready' && <PrimaryButton iconProps={{ iconName: 'AddFriend' }} text="Add employee" onClick={openNew} />}
      </header>

      <div className={styles.body}>
        {notice && (
          <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setNotice('')} isMultiline={false}>
            {notice}
          </MessageBar>
        )}
        {error && (
          <MessageBar
            messageBarType={MessageBarType.error}
            onDismiss={() => setError('')}
            actions={<PrimaryButton text="Try again" onClick={() => load()} />}
          >
            {error}
          </MessageBar>
        )}

        {state === 'loading' && <Spinner size={SpinnerSize.large} label="Loading employees" style={{ padding: 40 }} />}

        {state === 'missingList' && (
          <div className={styles.empty}>
            <h3>The &quot;{listName}&quot; list doesn&apos;t exist on this site yet</h3>
            <p>Set it up now and the web part will create the list with all the columns it needs.</p>
            <PrimaryButton
              text={settingUp ? 'Setting up list…' : 'Set up list'}
              disabled={settingUp}
              onClick={setUpList}
            />
          </div>
        )}

        {state === 'ready' && (
          <Pivot aria-label="Employee views" headersOnly={false}>
            <PivotItem headerText="Directory" itemIcon="People">
              <EmployeeList
                employees={employees}
                pageSize={pageSize}
                onAdd={openNew}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </PivotItem>
            <PivotItem headerText="Dashboard" itemIcon="BarChartVertical">
              <Dashboard employees={employees} />
            </PivotItem>
          </Pivot>
        )}
      </div>

      <EmployeeForm
        isOpen={formOpen}
        employee={editing}
        service={service}
        onDismiss={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </section>
  );
};

export default EmployeeManagement;

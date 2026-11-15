import * as React from 'react';
import {
  Panel,
  PanelType,
  TextField,
  Dropdown,
  DatePicker,
  ChoiceGroup,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  DayOfWeek
} from '@fluentui/react';
import styles from './EmployeeManagement.module.scss';
import { IEmployee, DEPARTMENTS, STATUSES, EmployeeStatus, emptyEmployee } from '../models/IEmployee';
import { EmployeeService } from '../services/EmployeeService';

export interface IEmployeeFormProps {
  isOpen: boolean;
  employee?: IEmployee;
  service: EmployeeService;
  onDismiss: () => void;
  onSaved: (saved: IEmployee, isNew: boolean) => Promise<void>;
}

type Errors = Partial<Record<keyof IEmployee, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const CODE_RE = /^[A-Za-z0-9-]{2,20}$/;

const validate = (e: IEmployee): Errors => {
  const errors: Errors = {};
  if (!e.fullName.trim()) errors.fullName = 'Enter the employee’s full name.';
  if (!e.employeeCode.trim()) errors.employeeCode = 'Enter an employee ID.';
  else if (!CODE_RE.test(e.employeeCode.trim())) errors.employeeCode = 'Use 2–20 letters, numbers or hyphens.';
  if (!e.email.trim()) errors.email = 'Enter a work email.';
  else if (!EMAIL_RE.test(e.email.trim())) errors.email = 'Enter an email like name@company.com.';
  if (e.phone.trim() && !PHONE_RE.test(e.phone.trim())) errors.phone = 'Use digits, spaces, +, ( ) or -.';
  if (!e.designation.trim()) errors.designation = 'Enter a designation.';
  if (!e.joiningDate) errors.joiningDate = 'Pick a joining date.';
  return errors;
};

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
const toIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EmployeeForm: React.FC<IEmployeeFormProps> = ({ isOpen, employee, service, onDismiss, onSaved }) => {
  const isNew = !employee?.id;
  const [form, setForm] = React.useState<IEmployee>(emptyEmployee());
  const [errors, setErrors] = React.useState<Errors>({});
  const [touched, setTouched] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setForm(employee ? { ...employee } : emptyEmployee());
      setErrors({});
      setTouched(false);
      setSaveError('');
    }
  }, [isOpen, employee]);

  const set = <K extends keyof IEmployee>(key: K, value: IEmployee[K]): void => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (touched) setErrors(validate(next));
  };

  const save = async (): Promise<void> => {
    setTouched(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveError('');
    try {
      if (await service.isCodeTaken(form.employeeCode.trim().toUpperCase(), form.id)) {
        setErrors({ employeeCode: 'Another employee already has this ID.' });
        return;
      }
      if (isNew) {
        const created = await service.create(form);
        await onSaved(created, true);
      } else {
        await service.update(form);
        await onSaved(form, false);
      }
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const footer = (): JSX.Element => (
    <div className={styles.panelFooter}>
      <PrimaryButton text={saving ? 'Saving…' : isNew ? 'Add employee' : 'Save changes'} disabled={saving} onClick={save} />
      <DefaultButton text="Cancel" disabled={saving} onClick={onDismiss} />
    </div>
  );

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      headerText={isNew ? 'Add employee' : `Edit ${employee?.fullName}`}
      closeButtonAriaLabel="Close"
      onRenderFooterContent={footer}
      isFooterAtBottom={true}
    >
      {saveError && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setSaveError('')} styles={{ root: { marginBottom: 12 } }}>
          {saveError}
        </MessageBar>
      )}

      <div className={styles.formGrid}>
        <TextField
          className={styles.full}
          label="Full name"
          required
          value={form.fullName}
          errorMessage={errors.fullName}
          onChange={(_, v) => set('fullName', v || '')}
        />
        <TextField
          label="Employee ID"
          required
          placeholder="e.g. EMP-1042"
          value={form.employeeCode}
          errorMessage={errors.employeeCode}
          onChange={(_, v) => set('employeeCode', v || '')}
        />
        <Dropdown
          label="Department"
          required
          options={DEPARTMENTS.map(d => ({ key: d, text: d }))}
          selectedKey={form.department}
          onChange={(_, o) => set('department', String(o?.key))}
        />
        <TextField
          label="Work email"
          type="email"
          required
          value={form.email}
          errorMessage={errors.email}
          onChange={(_, v) => set('email', v || '')}
        />
        <TextField
          label="Phone"
          type="tel"
          value={form.phone}
          errorMessage={errors.phone}
          onChange={(_, v) => set('phone', v || '')}
        />
        <TextField
          label="Designation"
          required
          value={form.designation}
          errorMessage={errors.designation}
          onChange={(_, v) => set('designation', v || '')}
        />
        <DatePicker
          label="Joining date"
          isRequired
          firstDayOfWeek={DayOfWeek.Monday}
          value={form.joiningDate ? new Date(`${form.joiningDate}T00:00:00`) : undefined}
          onSelectDate={d => set('joiningDate', d ? toIso(d) : '')}
          formatDate={d => (d ? d.toLocaleDateString() : '')}
          textField={{ errorMessage: errors.joiningDate }}
        />
        <ChoiceGroup
          className={styles.full}
          label="Status"
          selectedKey={form.status}
          options={STATUSES.map(s => ({ key: s, text: s }))}
          onChange={(_, o) => set('status', o?.key as EmployeeStatus)}
          styles={{ flexContainer: { display: 'flex', gap: 16 } }}
        />
      </div>
    </Panel>
  );
};

export default EmployeeForm;

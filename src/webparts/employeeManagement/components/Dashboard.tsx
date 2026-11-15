import * as React from 'react';
import styles from './EmployeeManagement.module.scss';
import { IEmployee, DEPARTMENTS, EmployeeStatus } from '../models/IEmployee';
import { deptColor, initials, formatDate } from './helpers';

export interface IDashboardProps {
  employees: IEmployee[];
}

interface IDeptStats {
  name: string;
  total: number;
  byStatus: Record<EmployeeStatus, number>;
}

const SEG_CLASS: Record<EmployeeStatus, string> = {
  Active: styles.segActive,
  'On Leave': styles.segOnLeave,
  Inactive: styles.segInactive
};

const Dashboard: React.FC<IDashboardProps> = ({ employees }) => {
  const stats = React.useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const count = (s: EmployeeStatus): number => employees.filter(e => e.status === s).length;

    const depts: IDeptStats[] = DEPARTMENTS.map(name => {
      const inDept = employees.filter(e => e.department === name);
      return {
        name,
        total: inDept.length,
        byStatus: {
          Active: inDept.filter(e => e.status === 'Active').length,
          'On Leave': inDept.filter(e => e.status === 'On Leave').length,
          Inactive: inDept.filter(e => e.status === 'Inactive').length
        }
      };
    })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);

    const recent = employees
      .filter(e => e.joiningDate)
      .sort((a, b) => (a.joiningDate < b.joiningDate ? 1 : -1))
      .slice(0, 6);

    return {
      total: employees.length,
      active: count('Active'),
      onLeave: count('On Leave'),
      inactive: count('Inactive'),
      newHires: employees.filter(e => e.joiningDate && new Date(e.joiningDate) >= ninetyDaysAgo).length,
      depts,
      maxDept: depts.length ? depts[0].total : 1,
      recent
    };
  }, [employees]);

  if (!employees.length) {
    return (
      <div className={styles.empty} style={{ marginTop: 16 }}>
        <h3>Nothing to report yet</h3>
        <p>The dashboard fills in as you add employees in the Directory tab.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total employees</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>Active</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.onLeave}</div>
          <div className={styles.statLabel}>On leave</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.newHires}</div>
          <div className={styles.statLabel}>Joined in the last 90 days</div>
        </div>
      </div>

      <div className={styles.dashGrid}>
        <div>
          <h3 className={styles.sectionTitle}>Headcount by department</h3>
          {stats.depts.map(d => (
            <div className={styles.deptRow} key={d.name}>
              <span className={styles.deptName} title={d.name}>{d.name}</span>
              <div
                className={styles.bar}
                role="img"
                aria-label={`${d.name}: ${d.byStatus.Active} active, ${d.byStatus['On Leave']} on leave, ${d.byStatus.Inactive} inactive`}
              >
                {(Object.keys(d.byStatus) as EmployeeStatus[]).map(s =>
                  d.byStatus[s] ? (
                    <div
                      key={s}
                      className={`${styles.seg} ${SEG_CLASS[s]}`}
                      style={{ width: `${(d.byStatus[s] / stats.maxDept) * 100}%` }}
                    />
                  ) : null
                )}
              </div>
              <span className={styles.deptCount}>{d.total}</span>
            </div>
          ))}
          <div className={styles.legend}>
            <span className={`${styles.status} ${styles.statusActive}`}>Active</span>
            <span className={`${styles.status} ${styles.statusOnLeave}`}>On leave</span>
            <span className={`${styles.status} ${styles.statusInactive}`}>Inactive</span>
          </div>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>Most recent joiners</h3>
          <ul className={styles.recentList}>
            {stats.recent.map(e => (
              <li key={e.id}>
                <span className={styles.avatar} style={{ background: deptColor(e.department) }} aria-hidden="true">
                  {initials(e.fullName)}
                </span>
                <span className={styles.nameText}>
                  <strong>{e.fullName}</strong>
                  <span>{e.designation}, {e.department}</span>
                </span>
                <span className={styles.recentDate}>{formatDate(e.joiningDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

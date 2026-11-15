import { SPHttpClient, SPHttpClientResponse, ISPHttpClientOptions } from '@microsoft/sp-http';
import { IEmployee, ISPEmployeeItem, DEPARTMENTS, STATUSES } from '../models/IEmployee';

const SELECT_FIELDS =
  'Id,Title,EmployeeCode,Email,Phone,Department,Designation,JoiningDate,EmployeeStatus,Modified';

/**
 * All SharePoint access lives here, so components never touch REST directly.
 * Uses SPHttpClient, which handles authentication and the request digest for you.
 */
export class EmployeeService {
  private readonly _listUrl: string;

  constructor(
    private readonly _http: SPHttpClient,
    private readonly _webUrl: string,
    private readonly _listName: string
  ) {
    this._listUrl = `${_webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(_listName)}')`;
  }

  // ---------- Read ----------

  public async getAll(): Promise<IEmployee[]> {
    const url = `${this._listUrl}/items?$select=${SELECT_FIELDS}&$orderby=Title asc&$top=5000`;
    const res = await this._http.get(url, SPHttpClient.configurations.v1);
    await this._ensureOk(res, 'load employees');
    const json: { value: ISPEmployeeItem[] } = await res.json();
    return json.value.map(EmployeeService._toEmployee);
  }

  public async getById(id: number): Promise<IEmployee> {
    const res = await this._http.get(
      `${this._listUrl}/items(${id})?$select=${SELECT_FIELDS}`,
      SPHttpClient.configurations.v1
    );
    await this._ensureOk(res, 'load the employee');
    return EmployeeService._toEmployee(await res.json());
  }

  // ---------- Create / Update / Delete ----------

  public async create(employee: IEmployee): Promise<IEmployee> {
    const res = await this._http.post(
      `${this._listUrl}/items`,
      SPHttpClient.configurations.v1,
      this._options(EmployeeService._toSPPayload(employee))
    );
    await this._ensureOk(res, 'add the employee');
    return EmployeeService._toEmployee(await res.json());
  }

  public async update(employee: IEmployee): Promise<void> {
    if (!employee.id) throw new Error('Cannot update an employee without an id.');
    const res = await this._http.post(
      `${this._listUrl}/items(${employee.id})`,
      SPHttpClient.configurations.v1,
      this._options(EmployeeService._toSPPayload(employee), {
        'IF-MATCH': '*',
        'X-HTTP-Method': 'MERGE'
      })
    );
    await this._ensureOk(res, 'save the employee');
  }

  public async remove(id: number): Promise<void> {
    // recycle() sends the item to the site recycle bin so it can be restored.
    const res = await this._http.post(
      `${this._listUrl}/items(${id})/recycle()`,
      SPHttpClient.configurations.v1,
      {}
    );
    await this._ensureOk(res, 'delete the employee');
  }

  /** Checks the Employee ID is unique before saving. */
  public async isCodeTaken(code: string, excludeId?: number): Promise<boolean> {
    const safe = code.replace(/'/g, "''");
    const res = await this._http.get(
      `${this._listUrl}/items?$select=Id&$filter=EmployeeCode eq '${encodeURIComponent(safe)}'&$top=2`,
      SPHttpClient.configurations.v1
    );
    await this._ensureOk(res, 'check the employee ID');
    const json: { value: { Id: number }[] } = await res.json();
    return json.value.some(i => i.Id !== excludeId);
  }

  // ---------- List provisioning ----------

  public async listExists(): Promise<boolean> {
    const res = await this._http.get(`${this._listUrl}?$select=Id`, SPHttpClient.configurations.v1);
    return res.ok;
  }

  /** Creates the list and its columns. Safe to run more than once. */
  public async ensureList(): Promise<void> {
    if (!(await this.listExists())) {
      const res = await this._http.post(
        `${this._webUrl}/_api/web/lists`,
        SPHttpClient.configurations.v1,
        this._options({
          Title: this._listName,
          BaseTemplate: 100,
          Description: 'Employee records managed by the Employee Management web part'
        })
      );
      await this._ensureOk(res, 'create the list');
    }

    const existing = await this._getFieldNames();
    const fields: string[] = [
      `<Field Type="Text" Name="EmployeeCode" StaticName="EmployeeCode" DisplayName="Employee ID" Required="TRUE" EnforceUniqueValues="TRUE" Indexed="TRUE" MaxLength="20" />`,
      `<Field Type="Text" Name="Email" StaticName="Email" DisplayName="Email" Required="TRUE" />`,
      `<Field Type="Text" Name="Phone" StaticName="Phone" DisplayName="Phone" />`,
      EmployeeService._choiceXml('Department', 'Department', DEPARTMENTS),
      `<Field Type="Text" Name="Designation" StaticName="Designation" DisplayName="Designation" />`,
      `<Field Type="DateTime" Name="JoiningDate" StaticName="JoiningDate" DisplayName="Joining date" Format="DateOnly" />`,
      EmployeeService._choiceXml('EmployeeStatus', 'Status', STATUSES)
    ];

    for (const xml of fields) {
      const name = /Name="([^"]+)"/.exec(xml)![1];
      if (existing.indexOf(name) !== -1) continue;
      const res = await this._http.post(
        `${this._listUrl}/fields/createfieldasxml`,
        SPHttpClient.configurations.v1,
        this._options({
          parameters: { SchemaXml: xml, Options: 8 /* AddFieldToDefaultView */ }
        })
      );
      await this._ensureOk(res, `create the ${name} column`);
    }

    // Rename the built-in Title column to something meaningful.
    await this._http.post(
      `${this._listUrl}/fields/getbyinternalnameortitle('Title')`,
      SPHttpClient.configurations.v1,
      this._options({ Title: 'Full name' }, { 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' })
    );
  }

  // ---------- Helpers ----------

  private async _getFieldNames(): Promise<string[]> {
    const res = await this._http.get(
      `${this._listUrl}/fields?$select=InternalName&$filter=Hidden eq false`,
      SPHttpClient.configurations.v1
    );
    await this._ensureOk(res, 'read list columns');
    const json: { value: { InternalName: string }[] } = await res.json();
    return json.value.map(f => f.InternalName);
  }

  private _options(body: object, extraHeaders: Record<string, string> = {}): ISPHttpClientOptions {
    return {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'application/json;odata.metadata=none',
        ...extraHeaders
      },
      body: JSON.stringify(body)
    };
  }

  private async _ensureOk(res: SPHttpClientResponse, action: string): Promise<void> {
    if (res.ok) return;
    let detail = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      detail = err?.error?.message?.value || err?.['odata.error']?.message?.value || err?.error?.message || detail;
    } catch {
      /* body was not JSON */
    }
    throw new Error(`Couldn't ${action}: ${detail}`);
  }

  private static _choiceXml(name: string, display: string, choices: string[]): string {
    const options = choices.map(c => `<CHOICE>${c}</CHOICE>`).join('');
    return `<Field Type="Choice" Name="${name}" StaticName="${name}" DisplayName="${display}" Format="Dropdown"><Default>${choices[0]}</Default><CHOICES>${options}</CHOICES></Field>`;
  }

  private static _toEmployee(i: ISPEmployeeItem): IEmployee {
    return {
      id: i.Id,
      fullName: i.Title || '',
      employeeCode: i.EmployeeCode || '',
      email: i.Email || '',
      phone: i.Phone || '',
      department: i.Department || '',
      designation: i.Designation || '',
      joiningDate: i.JoiningDate ? i.JoiningDate.substring(0, 10) : '',
      status: i.EmployeeStatus || 'Active',
      modified: i.Modified
    };
  }

  private static _toSPPayload(e: IEmployee): Partial<ISPEmployeeItem> {
    return {
      Title: e.fullName.trim(),
      EmployeeCode: e.employeeCode.trim().toUpperCase(),
      Email: e.email.trim().toLowerCase(),
      Phone: e.phone.trim(),
      Department: e.department,
      Designation: e.designation.trim(),
      JoiningDate: e.joiningDate ? `${e.joiningDate}T00:00:00Z` : null,
      EmployeeStatus: e.status
    };
  }
}

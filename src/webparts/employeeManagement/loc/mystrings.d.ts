declare interface IEmployeeManagementWebPartStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  TitleFieldLabel: string;
  ListNameFieldLabel: string;
  ListNameFieldDescription: string;
  PageSizeFieldLabel: string;
}

declare module 'EmployeeManagementWebPartStrings' {
  const strings: IEmployeeManagementWebPartStrings;
  export = strings;
}

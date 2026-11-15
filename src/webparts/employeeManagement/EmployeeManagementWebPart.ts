import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneSlider
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'EmployeeManagementWebPartStrings';
import EmployeeManagement from './components/EmployeeManagement';
import { IEmployeeManagementProps } from './components/IEmployeeManagementProps';
import { EmployeeService } from './services/EmployeeService';

export interface IEmployeeManagementWebPartProps {
  title: string;
  listName: string;
  pageSize: number;
}

export default class EmployeeManagementWebPart extends BaseClientSideWebPart<IEmployeeManagementWebPartProps> {
  private _isDarkTheme: boolean = false;

  public render(): void {
    const service = new EmployeeService(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl,
      this.properties.listName || 'Employees'
    );

    const element: React.ReactElement<IEmployeeManagementProps> = React.createElement(EmployeeManagement, {
      title: this.properties.title,
      listName: this.properties.listName || 'Employees',
      pageSize: this.properties.pageSize || 10,
      service,
      isDarkTheme: this._isDarkTheme,
      currentUserDisplayName: this.context.pageContext.user.displayName
    });

    ReactDom.render(element, this.domElement);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) return;
    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('title', { label: strings.TitleFieldLabel }),
                PropertyPaneTextField('listName', {
                  label: strings.ListNameFieldLabel,
                  description: strings.ListNameFieldDescription
                }),
                PropertyPaneSlider('pageSize', {
                  label: strings.PageSizeFieldLabel,
                  min: 5,
                  max: 50,
                  step: 5
                })
              ]
            }
          ]
        }
      ]
    };
  }
}

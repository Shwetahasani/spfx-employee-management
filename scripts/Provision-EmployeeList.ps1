<#
  Optional: provisions the Employees list and loads sample data with PnP PowerShell.
  The web part can also create the list itself ("Set up list" button), so this is
  only needed if you prefer scripted provisioning or want demo data.

  Prerequisites:
    Install-Module PnP.PowerShell -Scope CurrentUser
    (PnP.PowerShell 2.x requires PowerShell 7.2+ and your own Entra ID app registration;
     pass its client ID with -ClientId.)

  Usage:
    ./Provision-EmployeeList.ps1 -SiteUrl https://contoso.sharepoint.com/sites/hr -ClientId <app-guid> -WithSampleData
#>
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl,
  [Parameter(Mandatory = $true)][string]$ClientId,
  [string]$ListName = "Employees",
  [switch]$WithSampleData
)

Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive

$list = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
if (-not $list) {
  Write-Host "Creating list '$ListName'..."
  $list = New-PnPList -Title $ListName -Template GenericList -OnQuickLaunch
}

Set-PnPField -List $ListName -Identity "Title" -Values @{ Title = "Full name" }

$fields = @(
  '<Field Type="Text" Name="EmployeeCode" StaticName="EmployeeCode" DisplayName="Employee ID" Required="TRUE" EnforceUniqueValues="TRUE" Indexed="TRUE" MaxLength="20" />',
  '<Field Type="Text" Name="Email" StaticName="Email" DisplayName="Email" Required="TRUE" />',
  '<Field Type="Text" Name="Phone" StaticName="Phone" DisplayName="Phone" />',
  '<Field Type="Choice" Name="Department" StaticName="Department" DisplayName="Department" Format="Dropdown"><Default>Engineering</Default><CHOICES><CHOICE>Engineering</CHOICE><CHOICE>Human Resources</CHOICE><CHOICE>Finance</CHOICE><CHOICE>Sales</CHOICE><CHOICE>Marketing</CHOICE><CHOICE>Operations</CHOICE><CHOICE>Support</CHOICE></CHOICES></Field>',
  '<Field Type="Text" Name="Designation" StaticName="Designation" DisplayName="Designation" />',
  '<Field Type="DateTime" Name="JoiningDate" StaticName="JoiningDate" DisplayName="Joining date" Format="DateOnly" />',
  '<Field Type="Choice" Name="EmployeeStatus" StaticName="EmployeeStatus" DisplayName="Status" Format="Dropdown"><Default>Active</Default><CHOICES><CHOICE>Active</CHOICE><CHOICE>On Leave</CHOICE><CHOICE>Inactive</CHOICE></CHOICES></Field>'
)

foreach ($xml in $fields) {
  $name = ([xml]$xml).Field.Name
  if (-not (Get-PnPField -List $ListName -Identity $name -ErrorAction SilentlyContinue)) {
    Write-Host "Adding column $name"
    Add-PnPFieldFromXml -List $ListName -FieldXml $xml | Out-Null
    Add-PnPViewField -List $ListName -Identity "All Items" -Fields $name -ErrorAction SilentlyContinue | Out-Null
  }
}

if ($WithSampleData) {
  # Fictional demo records only.
  $sample = @(
    @{ Title = "Aarav Sharma";  EmployeeCode = "EMP-1001"; Email = "aarav.sharma@example.com";  Department = "Engineering";     Designation = "Senior Developer";   JoiningDate = "2023-04-10"; EmployeeStatus = "Active" },
    @{ Title = "Meera Iyer";    EmployeeCode = "EMP-1002"; Email = "meera.iyer@example.com";    Department = "Human Resources"; Designation = "HR Business Partner"; JoiningDate = "2022-08-01"; EmployeeStatus = "Active" },
    @{ Title = "Rohan Verma";   EmployeeCode = "EMP-1003"; Email = "rohan.verma@example.com";   Department = "Finance";         Designation = "Financial Analyst";  JoiningDate = "2024-01-15"; EmployeeStatus = "On Leave" },
    @{ Title = "Sara Thomas";   EmployeeCode = "EMP-1004"; Email = "sara.thomas@example.com";   Department = "Sales";           Designation = "Account Executive";  JoiningDate = "2025-06-02"; EmployeeStatus = "Active" },
    @{ Title = "Kabir Mehta";   EmployeeCode = "EMP-1005"; Email = "kabir.mehta@example.com";   Department = "Engineering";     Designation = "QA Engineer";        JoiningDate = "2021-11-22"; EmployeeStatus = "Inactive" },
    @{ Title = "Ananya Gupta";  EmployeeCode = "EMP-1006"; Email = "ananya.gupta@example.com";  Department = "Marketing";       Designation = "Content Strategist"; JoiningDate = "2026-09-14"; EmployeeStatus = "Active" }
  )
  foreach ($row in $sample) {
    Add-PnPListItem -List $ListName -Values $row | Out-Null
    Write-Host "Added $($row.Title)"
  }
}

Write-Host "Done. List '$ListName' is ready at $SiteUrl" -ForegroundColor Green

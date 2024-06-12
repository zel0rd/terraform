param (
    [string]$projectName
)

if (-not $projectName) {
    Write-Host "Usage: .\create_terraform_project.ps1 -projectName <project_name>"
    exit
}

# 디렉토리 생성
New-Item -ItemType Directory -Path $projectName -Force
New-Item -ItemType Directory -Path "$projectName\instance" -Force

# provider.tf 파일 생성
$providerContent = @"
provider "aws" {
  region = "ap-northeast-2"
}
"@
$providerContent | Out-File -FilePath "$projectName\provider.tf" -Encoding UTF8

# variables.tf 파일 생성
$variablesContent = @"
variable "instance_type" {
  description = "Type of instance to create"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID to use for the instance"
  type        = string
  default     = "ami-05399e027db5dded5"
}

variable "key_name" {
  description = "Key pair name to use for the instance"
  type        = string
  default     = "my-key-pair"
}

variable "security_group" {
  description = "Security group to assign to the instance"
  type        = string
  default     = "launch-wizard-1"
}
"@
$variablesContent | Out-File -FilePath "$projectName\variables.tf" -Encoding UTF8

# main.tf 파일 생성
$mainContent = @"
module "instance" {
  source = "./instance"

  instance_type  = var.instance_type
  ami_id         = var.ami_id
  key_name       = var.key_name
  security_group = var.security_group
}
"@
$mainContent | Out-File -FilePath "$projectName\main.tf" -Encoding UTF8

# instance/main.tf 파일 생성
$instanceMainContent = @"
resource "aws_instance" "example" {
  ami             = var.ami_id
  instance_type   = var.instance_type
  security_groups = [var.security_group]
  key_name        = var.key_name

  tags = {
    Name = "example-instance"
  }
}
"@
$instanceMainContent | Out-File -FilePath "$projectName\instance\main.tf" -Encoding UTF8

# instance/variables.tf 파일 생성
$instanceVariablesContent = @"
variable "instance_type" {
  description = "Type of instance to create"
  type        = string
}

variable "ami_id" {
  description = "AMI ID to use for the instance"
  type        = string
}

variable "key_name" {
  description = "Key pair name to use for the instance"
  type        = string
}

variable "security_group" {
  description = "Security group to assign to the instance"
  type        = string
}
"@
$instanceVariablesContent | Out-File -FilePath "$projectName\instance\variables.tf" -Encoding UTF8

Write-Host "Terraform project structure created successfully in folder '$projectName'!"

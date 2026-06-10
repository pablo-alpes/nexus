variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "tenant_id" {
  description = "Optional tenant/client identifier for multi-tenant isolation. Leave empty for single-tenant."
  type        = string
  default     = ""
}

variable "app_name" {
  description = "Application name used in resource naming"
  type        = string
  default     = "nexus-cloud"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "mongodb_uri" {
  description = "MONGODB_URI for the app (optional; prefer mongodb_uri_secret_arn in production)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mongodb_uri_secret_arn" {
  description = "ARN of Secrets Manager secret containing MONGODB_URI (recommended for production)"
  type        = string
  default     = ""
}

variable "jwt_secret_arn" {
  description = "ARN of Secrets Manager secret containing JWT_SECRET (optional)"
  type        = string
  default     = ""
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "cpu" {
  description = "Task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "memory_mb" {
  description = "Task memory in MB"
  type        = number
  default     = 1024
}

variable "container_port" {
  description = "Port the app listens on"
  type        = number
  default     = 3000
}

variable "domain_name" {
  description = "Optional domain for ALB (e.g. app.example.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (required if domain_name is set)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "VPC ID. Leave empty to create a new VPC."
  type        = string
  default     = ""
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks. Empty = use default subnets."
  type        = list(string)
  default     = []
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB. Empty = use default subnets."
  type        = list(string)
  default     = []
}

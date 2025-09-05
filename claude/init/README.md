# CFO AI SaaS - Context Engineering Documentation

## Overview
This directory contains comprehensive context engineering documentation for the CFO AI SaaS platform, designed following Anthropic's best practices for Claude Code development.

## File Structure

### Core Documentation
- **`project_overview.md`** - High-level project vision, value proposition, and success metrics
- **`technical_requirements.md`** - Functional and non-functional requirements with acceptance criteria
- **`architecture.md`** - System architecture, component design, and data flow diagrams
- **`database_schema.sql`** - Complete PostgreSQL schema with RLS policies and indexes

### Development Guides
- **`development_rules.md`** - Coding standards, conventions, and best practices
- **`work_plan.md`** - Detailed 12-week sprint breakdown with task tracking
- **`api_specifications.md`** - Complete REST API documentation with examples
- **`integration_requirements.md`** - External service integrations and configurations

### Context Engineering
- **`claude_context.md`** - Comprehensive context for Claude Code development
- **`README.md`** - This documentation guide

## Usage Instructions

### For Development
1. Load the main `CLAUDE.md` file at project root for general context
2. Reference specific files in `claude/init/` for detailed implementation guidance
3. Update documentation as the project evolves

### Context Loading Pattern
```markdown
# In your prompts, reference relevant documentation:
@claude/init/technical_requirements.md for requirements
@claude/init/architecture.md for system design
@claude/init/database_schema.sql for data model
@claude/init/api_specifications.md for API details
```

## Key Project Information

### Project Identity
**CFO AI** - Multi-tenant SaaS platform for Colombian SME financial automation
- Automated invoice processing from Outlook emails
- AI-powered document classification and data extraction  
- Colombian tax calculation compliance (IVA, ReteFuente, ReteIVA, ICA)
- Accounting system integration (Siigo, World Office, SAP)
- CFO-level financial insights and reporting

### Technology Stack
- **Frontend/Backend**: Next.js 13+ (App Router) with TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI/ML**: OpenAI GPT-4 for classification and OCR
- **Integrations**: Microsoft Graph API, Colombian tax authorities
- **Deployment**: Vercel + Supabase

### Development Phase
**MVP Development (12 weeks)** targeting:
- 1,800+ invoices/month processing capacity per tenant
- 95%+ automation rate with minimal human review
- Colombian tax compliance certification
- Production deployment with 10+ pilot customers

## Documentation Standards

### File Organization
- **Modular Structure**: Each concern separated into focused files
- **Cross-References**: Use `@filename` to reference other documentation
- **Version Control**: All documentation is version-controlled with code
- **Update Frequency**: Review and update quarterly or with major changes

### Context Optimization
- **Top-Heavy Structure**: Long documents placed at top of prompts
- **Hierarchical Loading**: Project-level `CLAUDE.md` loads automatically
- **Token Management**: Use `/context` command to monitor usage
- **Security**: No sensitive credentials or PII in context files

## Colombian Business Context

### Tax Compliance Requirements
- **DIAN UBL Format**: Colombian electronic invoicing standard
- **Tax Calculations**: Rules-based engine for accurate compliance
- **Audit Trail**: Complete financial operation logging
- **Retention**: 5-year minimum data retention requirement

### Target Market
- **Colombian SMEs**: 50-500 employee companies
- **Accounting Firms**: Service providers managing multiple clients
- **Industry Focus**: Professional services, retail, manufacturing
- **Pain Points**: Manual invoice processing, tax calculation errors, compliance risk

## Development Workflow

### Sprint Structure
- **12-week MVP timeline** divided into 5 phases
- **Task Tracking**: Detailed acceptance criteria with checkbox completion
- **Quality Gates**: Testing, security review, compliance validation
- **Demo Schedule**: Bi-weekly stakeholder demonstrations

### Code Standards
- **Security-First**: Multi-tenant isolation, encrypted storage, audit logging
- **Performance**: <2s API responses, <10min document processing
- **Compliance**: Colombian tax regulations, data protection laws
- **Testing**: >80% coverage with regulatory compliance test cases

## Getting Started

### For New Developers
1. Read `project_overview.md` for business context
2. Review `technical_requirements.md` for functional requirements
3. Study `architecture.md` for system design understanding
4. Reference `development_rules.md` for coding standards
5. Check `work_plan.md` for current sprint objectives

### For AI Assistance
Load the project context with:
```
@CLAUDE.md (main project context)
@claude/init/technical_requirements.md (for feature development)
@claude/init/architecture.md (for system design questions)
@claude/init/database_schema.sql (for data operations)
@claude/init/api_specifications.md (for API development)
```

## Maintenance

### Regular Updates
- **Monthly**: Review work plan progress and update status
- **Quarterly**: Update technical requirements and architecture docs
- **Release**: Update API specifications with new endpoints
- **Architecture Changes**: Immediately update relevant documentation

### Quality Assurance
- **Documentation Review**: Include in code review process  
- **Consistency Checks**: Ensure cross-references remain valid
- **Completeness**: Verify all major decisions are documented
- **Accessibility**: Maintain clear, jargon-free explanations

This documentation set provides comprehensive context for developing the CFO AI SaaS platform with proper Colombian tax compliance, multi-tenant architecture, and production-ready security standards.
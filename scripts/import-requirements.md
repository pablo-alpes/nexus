# Importing DORA Requirements

## Excel File Format

When importing DORA requirements from Excel, ensure your file has the following columns:

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| Requirement ID | Yes | Unique identifier for the requirement | REQ-001 |
| Title | Yes | Short title of the requirement | ICT Risk Management Framework |
| Description | Yes | Detailed description | Establish and maintain an ICT risk management framework... |
| Pillar | Yes | One of the 5 DORA pillars | ICT_RISK_MANAGEMENT |
| Article | No | Article number from DORA regulation | Article 6 |
| Paragraph | No | Paragraph reference | Paragraph 1 |
| Legal Text | Yes | Full legal text of the requirement | The text from the regulation... |
| Applicable To | No | Comma-separated list of entity types | Credit Institution,Investment Firm |

## DORA Pillars

Use these exact values for the Pillar column:

- `ICT_RISK_MANAGEMENT` - ICT Risk Management
- `INCIDENT_MANAGEMENT` - ICT-Related Incident Management
- `RESILIENCE_TESTING` - Digital Operational Resilience Testing
- `THIRD_PARTY_RISK` - ICT Third-Party Risk Management
- `INFORMATION_SHARING` - Information Sharing

## Import Process

1. Prepare your Excel file with the required columns
2. Use the API endpoint or the admin interface to upload
3. The system will validate and import all requirements
4. Requirements can then be mapped to controls

## Example Excel Row

```
Requirement ID: REQ-001
Title: ICT Risk Management Framework
Description: Establish comprehensive ICT risk management framework
Pillar: ICT_RISK_MANAGEMENT
Article: Article 6
Paragraph: Paragraph 1
Legal Text: [Full legal text from DORA regulation]
Applicable To: Credit Institution,Investment Firm
```


# Guía de Prepoblación de Datos

Esta guía explica cómo prepoblar todos los datos del sistema para Chilean Privacy.

## 📋 Comandos Disponibles

### 🚀 Comando Principal (Recomendado)

Para cargar **todos** los datos de Chilean Privacy (Legal Compliance + Privacy Management):

```bash
npm run load:chilean-privacy
```

Este comando:
- ✅ Verifica datos existentes y evita duplicados
- ✅ Carga Legal Compliance (Requirements, Questions, Controls)
- ✅ Carga Privacy Management (operational records)
- ✅ Preserva datos existentes

### 📚 Comandos Individuales

#### Legal Compliance (Requisitos y Cuestionario)

```bash
# Setup completo de Legal Compliance
npm run setup:chilean-privacy
```

Este comando ejecuta:
1. `fetch-chilean-privacy-law.js` - Descarga y parsea la ley
2. `import-chilean-privacy-requirements.js` - Importa requirements a la BD
3. `create-chilean-privacy-questionnaire.js` - Crea el cuestionario

**Nota:** Este comando preserva datos existentes si el archivo JSON tiene más requirements que el nuevo parseo.

#### Controles ISO 27002

```bash
# Agregar controles ISO 27002 para Chilean Privacy
npm run add-iso27002-controls-chilean-privacy
```

#### Mapeo de Requisitos a Controles

```bash
# Mapear requirements a controles
npm run map-chilean-privacy-requirements-to-controls
```

#### Mappings Precomputed

```bash
# Precomputar mappings pregunta→requisito
npm run precompute:mappings:privacy
```

**Nota:** Este comando crea backup automático antes de recomputar.

#### Privacy Management (Datos Operacionales)

```bash
# Prepoblar datos de Privacy Management
npm run prepopulate:privacy
```

Este comando crea:
- 10 Data Subject Requests
- 10 Consents
- 10 Processing Activities (Data Processing Register)
- 10 Breach Notifications
- 10 Third Party Processors
- 10 Privacy by Design Projects
- 10 DPIAs
- 10 Data Governance records
- 5 Data Purge records

### 🔄 Comandos de Exportación/Importación

#### Exportar Datos

```bash
# Exportar requirements a JSON
npm run export:requirements

# Exportar mappings a JSON
npm run export:mappings

# Exportar todo (requirements + mappings)
npm run export:all
```

#### Importar Mappings

```bash
# Importar mappings desde backup JSON
npm run import:mappings
```

## 📊 Flujo Completo de Prepoblación

### Opción 1: Carga Automática (Recomendada)

```bash
# Un solo comando carga todo
npm run load:chilean-privacy
```

### Opción 2: Carga Manual Paso a Paso

```bash
# 1. Legal Compliance
npm run setup:chilean-privacy
npm run add-iso27002-controls-chilean-privacy
npm run map-chilean-privacy-requirements-to-controls
npm run precompute:mappings:privacy

# 2. Privacy Management
npm run prepopulate:privacy
```

## 📁 Archivos de Datos

### Archivos de Entrada (Knowledge Base)

- `data/chilean-privacy-requirements.json` - Requirements parseados (182)
- `data/chilean-privacy-questionnaire.json` - Cuestionario
- `data/iso27002-controls.json` - Controles ISO 27002
- `data/iso27701-controls.json` - Controles ISO 27701

### Archivos de Backup

- `data/chilean-privacy-mappings-backup.json` - Mappings precomputed
- `data/chilean-privacy-mappings-backup-{timestamp}.json` - Backups con timestamp

## 🔍 Verificación de Datos

### Verificar Requirements

```bash
# El script de carga muestra estadísticas
npm run load:chilean-privacy
```

Deberías ver:
- Requirements: 182
- Questions: ~20-30
- Controls: ~50-100

### Verificar Privacy Management

El script muestra:
- Data Subject Requests: 10
- Consents: 10
- Processing Activities: 10
- Breach Notifications: 10
- Third Party Processors: 10
- Privacy Projects: 10
- DPIAs: 10
- Data Governance: 10
- Data Purges: 5

## ⚠️ Preservación de Datos

Los scripts están diseñados para **preservar datos existentes**:

1. **Requirements**: Si el JSON tiene >= 50 requirements, no se sobrescribe
2. **Mappings**: Se crea backup automático antes de recomputar
3. **Privacy Management**: Verifica duplicados antes de crear

## 🛠️ Solución de Problemas

### No se ven los datos en la UI

1. Verifica que los datos estén en la BD:
   ```bash
   npm run export:requirements
   npm run export:mappings
   ```

2. Si los datos están en JSON pero no en BD:
   ```bash
   npm run load:chilean-privacy
   ```

3. Si los datos están en BD pero no en JSON:
   ```bash
   npm run export:all
   ```

### Datos perdidos

Si perdiste datos:

1. **Requirements**: Restaura desde `data/chilean-privacy-requirements.json`
   ```bash
   npm run load:chilean-privacy
   ```

2. **Mappings**: Restaura desde backup
   ```bash
   npm run import:mappings
   ```

3. **Privacy Management**: Re-ejecuta prepopulation
   ```bash
   npm run prepopulate:privacy
   ```

## 📝 Resumen de Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run load:chilean-privacy` | **Carga todo** (Legal Compliance + Privacy Management) |
| `npm run setup:chilean-privacy` | Setup Legal Compliance |
| `npm run prepopulate:privacy` | Prepoblar Privacy Management |
| `npm run precompute:mappings:privacy` | Precomputar mappings |
| `npm run export:all` | Exportar todo a JSON |
| `npm run import:mappings` | Importar mappings desde backup |

## 🎯 Comando Rápido para Empezar

```bash
# Cargar todo desde cero
npm run load:chilean-privacy
```

Este comando es **idempotente**: puedes ejecutarlo múltiples veces sin duplicar datos.
